import type { ApiMatch, ApiOdds, ApiResponse } from "./types.js";

const API_BASE = "https://api.meczyki.pl/api/v2/soccer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MeczykiClient {
  private lastRequestAt = 0;
  private requestGate: Promise<void> = Promise.resolve();

  constructor(
    private readonly delayMs: number,
    private readonly retries: number,
  ) {}

  private async waitForRequestSlot(): Promise<void> {
    const scheduled = this.requestGate.then(async () => {
      const waitMs = Math.max(0, this.delayMs - (Date.now() - this.lastRequestAt));
      if (waitMs > 0) await sleep(waitMs);
      this.lastRequestAt = Date.now();
    });
    this.requestGate = scheduled.catch(() => undefined);
    await scheduled;
  }

  private async get<T>(path: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      await this.waitForRequestSlot();

      try {
        const response = await fetch(`${API_BASE}${path}`, {
          headers: {
            accept: "application/json",
            "user-agent": "meczyki-daily-collector/1.0",
          },
          signal: AbortSignal.timeout(20_000),
        });

        if (response.ok) return (await response.json()) as T;

        if (response.status !== 429 && response.status < 500) {
          throw new Error(`HTTP ${response.status} dla ${path}`);
        }

        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 1_000 * 2 ** attempt);
      } catch (error) {
        lastError = error;
        if (attempt < this.retries) await sleep(1_000 * 2 ** attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Nie udało się pobrać ${path}`);
  }

  async getMatches(date: string, perPage = 20): Promise<ApiMatch[]> {
    const matches: ApiMatch[] = [];

    for (let page = 1; page <= 100; page += 1) {
      const query = new URLSearchParams({
        day: date,
        page: String(page),
        matches_per_page: String(perPage),
      });
      const response = await this.get<ApiResponse<ApiMatch[]>>(
        `/matches-by-competition/all?${query}`,
      );
      matches.push(...response.data);
      if (response.data.length < perPage) break;
    }

    return matches;
  }

  async getOdds(matchId: number): Promise<ApiOdds[]> {
    const query = new URLSearchParams();
    query.append("matchItem[]", String(matchId));
    const response = await this.get<ApiResponse<ApiOdds[]>>(
      `/bookie-match-odds?${query}`,
    );
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
