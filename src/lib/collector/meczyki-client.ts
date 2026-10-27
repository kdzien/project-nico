import type { ApiMatch, ApiOdds, ApiResponse } from "./types.js";

const API_BASE = "https://api.meczyki.pl/api/v2/soccer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MeczykiClient {
	private lastRequestAt = 0;
	private requestGate: Promise<void> = Promise.resolve();

	constructor(
		private readonly delayMs: number,
		private readonly retries: number,
	) {
		if (
			!Number.isFinite(delayMs) ||
			delayMs < 0 ||
			!Number.isInteger(retries) ||
			retries < 0 ||
			retries > 10
		) {
			throw new Error("Niepoprawny odstęp zapytań lub liczba ponowień.");
		}
	}

	private async waitForRequestSlot(): Promise<void> {
		const scheduled = this.requestGate.then(async () => {
			const waitMs = Math.max(0, this.delayMs - (Date.now() - this.lastRequestAt));
			if (waitMs > 0) {
				await sleep(waitMs);
			}
			this.lastRequestAt = Date.now();
		});
		this.requestGate = scheduled.catch(() => undefined);
		await scheduled;
	}

	private async get<T>(path: string): Promise<T> {
		for (let attempt = 0; ; attempt++) {
			await this.waitForRequestSlot();
			let response: Response;
			try {
				response = await fetch(`${API_BASE}${path}`, {
					headers: {
						accept: "application/json",
						"user-agent": "meczyki-daily-collector/1.0",
					},
					signal: AbortSignal.timeout(20_000),
				});
			} catch (error) {
				if (attempt >= this.retries) {
					throw error;
				}
				await sleep(1000 * 2 ** attempt);
				continue;
			}
			if (response.ok) {
				return (await response.json()) as T;
			}
			const error = new Error(`HTTP ${response.status} dla ${path}`);
			if ((response.status !== 429 && response.status < 500) || attempt >= this.retries) {
				throw error;
			}
			const header = response.headers.get("retry-after");
			const seconds = header === null ? NaN : Number(header);
			const delay = Number.isFinite(seconds)
				? seconds * 1000
				: header && Number.isFinite(Date.parse(header))
					? Date.parse(header) - Date.now()
					: 1000 * 2 ** attempt;
			await sleep(Math.max(0, delay));
		}
	}

	async getMatches(date: string, perPage = 20): Promise<ApiMatch[]> {
		const matches: ApiMatch[] = [];

		const seen = new Set<number>();
		for (let page = 1; ; page += 1) {
			const query = new URLSearchParams({
				day: date,
				page: String(page),
				matches_per_page: String(perPage),
			});
			const response = await this.get<ApiResponse<ApiMatch[]>>(
				`/matches-by-competition/all?${query}`,
			);
			for (const match of response.data) {
				if (seen.has(match.id)) {
					throw new Error("API powtórzyło mecz na kolejnej stronie; import przerwany.");
				}
				seen.add(match.id);
				matches.push(match);
			}
			if (response.data.length < perPage) {
				return matches;
			}
		}
	}

	async getOdds(matchId: number): Promise<ApiOdds[]> {
		const query = new URLSearchParams();
		query.append("matchItem[]", String(matchId));
		const response = await this.get<ApiResponse<ApiOdds[]>>(`/bookie-match-odds?${query}`);
		return response.data;
	}

	async getParticipantMatches(participantId: number, before: string): Promise<ApiMatch[]> {
		const query = new URLSearchParams({ lastMatchStartTime: before, future: "0" });
		const response = await this.get<ApiResponse<ApiMatch[]>>(
			`/participants/${participantId}/matches?${query}`,
		);
		return response.data;
	}

	async getHeadToHead(homeId: number, awayId: number): Promise<ApiMatch[]> {
		const response = await this.get<ApiResponse<ApiMatch[]>>(
			`/matches/head-to-head/${homeId}/${awayId}`,
		);
		return response.data;
	}

	async getStandings(competitionId: number, season: number): Promise<unknown> {
		const response = await this.get<ApiResponse<unknown>>(
			`/competitions/${competitionId}/live-standings/${season}`,
		);
		return response.data;
	}
}
