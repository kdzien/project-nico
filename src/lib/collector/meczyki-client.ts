import type {
	ApiMatch,
	ApiMatchesData,
	ApiOdds,
	ApiResponse,
	TeamLogo,
} from "@lib/collector/types";

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

	private async request(url: string, allowMissing = false): Promise<Response> {
		for (let attempt = 0; ; attempt++) {
			await this.waitForRequestSlot();
			let response: Response;
			try {
				response = await fetch(url, {
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
			if (response.ok || (allowMissing && response.status === 404)) {
				return response;
			}
			const error = new Error(`HTTP ${response.status} dla ${url}`);
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

	private async get<T>(path: string): Promise<T> {
		const response = await this.request(`${API_BASE}${path}`);
		return (await response.json()) as T;
	}

	teamLogoUrl(participantId: number): string {
		if (!Number.isSafeInteger(participantId) || participantId <= 0) {
			throw new Error("Niepoprawne ID drużyny.");
		}
		return `https://pliki.meczyki.pl/live-score/soccer/participant/${participantId}/50w.webp`;
	}

	async getTeamLogo(participantId: number): Promise<TeamLogo | null> {
		const response = await this.request(this.teamLogoUrl(participantId), true);
		if (response.status === 404) {
			await response.body?.cancel();
			return null;
		}
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error("Brak danych herbu.");
		}
		const chunks: Uint8Array[] = [];
		let size = 0;
		try {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}
				size += value.length;
				if (size > 65536) {
					await reader.cancel();
					throw new Error("Herb przekracza limit 64 KiB.");
				}
				chunks.push(value);
			}
		} finally {
			reader.releaseLock();
		}
		const data = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			data.set(chunk, offset);
			offset += chunk.length;
		}
		// The CDN can label WebP as application/octet-stream; validate the actual signature.
		const signature = new TextDecoder("ascii");
		if (
			size < 12 ||
			signature.decode(data.subarray(0, 4)) !== "RIFF" ||
			signature.decode(data.subarray(8, 12)) !== "WEBP"
		) {
			throw new Error("Niepoprawny format herbu; oczekiwano WebP.");
		}
		return { data };
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
			const response = await this.get<ApiResponse<ApiMatchesData>>(
				`/matches-by-competition/all?${query}`,
			);
			const pageMatches = Array.isArray(response.data)
				? response.data
				: response.data?.matches;
			if (!Array.isArray(pageMatches)) {
				throw new Error("API zwróciło niepoprawną listę meczów: brak data.matches.");
			}
			for (const match of pageMatches) {
				if (seen.has(match.id)) {
					throw new Error("API powtórzyło mecz na kolejnej stronie; import przerwany.");
				}
				seen.add(match.id);
				matches.push(match);
			}
			if (pageMatches.length < perPage) {
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
