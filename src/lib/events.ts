import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "@lib/models";
import { dayBounds } from "@lib/dates";

export const eventColumns =
	"*,home_team_record:teams!events_home_team_id_fkey(logo_hash),away_team_record:teams!events_away_team_id_fkey(logo_hash)";

export async function loadEvents(db: SupabaseClient, day: string): Promise<EventRow[]> {
	const [start, end] = dayBounds(day);
	const rows: EventRow[] = [];
	for (let offset = 0; ; offset += 500) {
		const { data, error } = await db
			.from("events")
			.select(eventColumns)
			.gte("kickoff", start)
			.lt("kickoff", end)
			.order("kickoff")
			.order("id")
			.range(offset, offset + 499)
			.overrideTypes<EventRow[], { merge: false }>();
		if (error) {
			throw new Error("Nie udało się odczytać wydarzeń. Sprawdź dostępność bazy.");
		}
		rows.push(...data);
		if (data.length < 500) {
			return rows;
		}
	}
}
