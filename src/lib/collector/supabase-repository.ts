import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollectionRepository } from "./json-repository.js";
import type { CollectedMatch, CollectionDocument } from "./types.js";

export function eventRecord(match: CollectedMatch, generatedAt: string) {
  return {
    provider: "meczyki", external_id: match.match_id, status: match.status,
    kickoff: match.kickoff, competition: match.competition, round: match.round,
    home_team: match.home.name, away_team: match.away.name,
    odds: match.odds,
    statistics: { home: match.home, away: match.away, h2h: match.h2h },
    imported_at: generatedAt,
  };
}

export class SupabaseRepository implements CollectionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async save(document: CollectionDocument): Promise<string> {
    // One request is one transaction: a failed import does not leave a partial day.
    if (document.matches.length) {
      const { error } = await this.db.from("events").upsert(
        document.matches.map((match) => eventRecord(match, document.generated_at)),
        { onConflict: "provider,external_id" },
      );
      if (error) throw new Error(`Zapis wydarzeń: ${error.message}`);
    }
    return `events:${document.date}:${document.matches.length}`;
  }
}
