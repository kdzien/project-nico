import type { SupabaseClient } from "@supabase/supabase-js";
import { syncTeams, type StoredTeam } from "@lib/collector/team-repository";
import type { MeczykiClient } from "@lib/collector/meczyki-client";
import type { CollectionRepository } from "@lib/collector/json-repository";
import type { CollectedMatch, CollectionDocument } from "@lib/collector/types";

export function eventRecord(
	match: CollectedMatch,
	generatedAt: string,
	teams = new Map<number, StoredTeam>(),
) {
	return {
		provider: "meczyki",
		external_id: match.match_id,
		status: match.status,
		kickoff: match.kickoff,
		competition: match.competition,
		competition_id: match.competition_id,
		competition_slug: match.competition_slug,
		competition_type: match.competition_type,
		competition_level: match.competition_level,
		competition_display_order: match.competition_display_order,
		country_id: match.country_id,
		country: match.country,
		country_slug: match.country_slug,
		round: match.round,
		home_team_id: teams.get(match.home.participant_id)?.id ?? null,
		away_team_id: teams.get(match.away.participant_id)?.id ?? null,
		home_team: match.home.name,
		away_team: match.away.name,
		odds: match.odds,
		statistics: { home: match.home, away: match.away, h2h: match.h2h },
		imported_at: generatedAt,
	};
}

export class SupabaseRepository implements CollectionRepository {
	constructor(
		private readonly db: SupabaseClient,
		private readonly logoClient?: Pick<MeczykiClient, "getTeamLogo" | "teamLogoUrl">,
	) {}

	async save(document: CollectionDocument): Promise<string> {
		// Team identities/assets are cached first; event upsert remains a single transaction.
		if (document.matches.length) {
			const teams = await syncTeams(this.db, document, this.logoClient);
			const { error } = await this.db.from("events").upsert(
				document.matches.map((match) => eventRecord(match, document.generated_at, teams)),
				{ onConflict: "provider,external_id" },
			);
			if (error) {
				throw new Error(`Zapis wydarzeń: ${error.message}`);
			}
		}
		return `events:${document.date}:${document.matches.length}`;
	}
}
