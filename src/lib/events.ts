import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "@lib/models";
import { dayBounds } from "@lib/dates";

export async function loadEvents(db: SupabaseClient, day: string): Promise<EventRow[]> {
	const [start, end] = dayBounds(day);
	const rows: EventRow[] = [];
	for (let offset = 0; ; offset += 500) {
		const { data, error } = await db
			.from("events")
			.select("*")
			.gte("kickoff", start)
			.lt("kickoff", end)
			.order("kickoff")
			.order("id")
			.range(offset, offset + 499);
		if (error) {
			throw new Error("Nie udało się odczytać wydarzeń. Sprawdź dostępność bazy.");
		}
		rows.push(...(data as EventRow[]));
		if (data.length < 500) {
			return rows;
		}
	}
}
