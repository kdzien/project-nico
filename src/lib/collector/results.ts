import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeczykiClient } from "./meczyki-client.js";
import { calendarDate, dayBounds, validDate } from "../dates.js";
import { eventStatus } from "./status.js";

const score = z.number().int().nonnegative().nullable();
const resultSchema = z.object({
	id: z.number().int(),
	status: z.string(),
	startTime: z.iso.datetime({ offset: true }),
	homeScore: score.optional(),
	awayScore: score.optional(),
	withOvertime: z.boolean().optional(),
	attributes: z
		.array(z.object({ type: z.string(), value: z.union([z.string(), z.number(), z.null()]) }))
		.optional(),
});
export function matchResult(raw: unknown) {
	const match = resultSchema.parse(raw);
	const status = eventStatus(match.status);
	const value = (type: string): number | null => {
		const raw = match.attributes?.find((attribute) => attribute.type === type)?.value;
		if (raw === undefined || raw === null || raw === "" || !/^\d+$/.test(String(raw))) {
			return null;
		}
		const n = Number(raw);
		return Number.isSafeInteger(n) && n >= 0 ? n : null;
	};
	let home = value("home_regular_time_score");
	let away = value("away_regular_time_score");
	// Only an explicit absence of extra time makes the aggregate score unambiguous.
	// If regulation attributes are present but invalid, keep the result unresolved.
	const hasRegular = match.attributes?.some((a) =>
		["home_regular_time_score", "away_regular_time_score"].includes(a.type),
	);
	if (!hasRegular && match.withOvertime === false) {
		home = match.homeScore ?? null;
		away = match.awayScore ?? null;
	}
	return {
		id: match.id,
		status,
		home: status === "finished" ? home : null,
		away: status === "finished" ? away : null,
		kickoff: match.startTime,
	};
}

export class ResultsFailure extends Error {
	constructor(
		message: string,
		readonly found: number,
		readonly saved: number,
	) {
		super(message);
	}
}

interface ResultsOptions {
	date?: string;
	now?: Date;
}

interface ResultCandidate {
	id: string;
	external_id: number;
	kickoff: string;
	status: string;
}

export async function refreshResults(
	db: SupabaseClient,
	client: Pick<MeczykiClient, "getMatches">,
	options: ResultsOptions = {},
) {
	const today = calendarDate(options.now ?? new Date());
	if (options.date !== undefined && !validDate(options.date)) {
		throw new Error("Niepoprawna data wyników.");
	}
	const candidates: ResultCandidate[] = [];
	// Snapshot the candidate set before settlement removes rows from it.
	for (let offset = 0; ; offset += 500) {
		let query = db
			.from("events")
			.select("id,external_id,kickoff,status")
			.eq("provider", "meczyki")
			.is("settled_at", null)
			.lt("kickoff", dayBounds(today)[1]);
		if (options.date) {
			const [start, end] = dayBounds(options.date);
			query = query.gte("kickoff", start).lt("kickoff", end);
		}
		const { data, error } = await query.order("id").range(offset, offset + 499);
		if (error) {
			throw new Error(`Lista wyników: ${error.message}`);
		}
		candidates.push(...data);
		if (data.length < 500) {
			break;
		}
	}
	const dates = new Set(candidates.map((candidate) => calendarDate(new Date(candidate.kickoff))));
	// A postponed fixture can disappear from its original day's list and reappear today.
	if (candidates.length && !options.date) {
		dates.add(today);
	}
	const ids = new Set(candidates.map((candidate) => candidate.external_id));
	const matches = new Map<number, unknown>();
	const errors: string[] = [];
	for (const date of [...dates].sort()) {
		try {
			for (const match of await client.getMatches(date)) {
				if (ids.has(match.id)) {
					matches.set(match.id, match);
				}
			}
		} catch (error) {
			errors.push(
				`${date}: ${error instanceof Error ? error.message : "Błąd pobrania listy"}`,
			);
		}
	}
	let updated = 0;
	let settled = 0;
	let missing = 0;
	for (const candidate of candidates) {
		const raw = matches.get(candidate.external_id);
		if (!raw) {
			missing++;
			continue;
		}
		try {
			const result = matchResult(raw);
			const terminal =
				result.status === "cancelled" ||
				(result.status === "finished" && result.home !== null && result.away !== null);
			const changed =
				result.status !== candidate.status ||
				Date.parse(result.kickoff) !== Date.parse(candidate.kickoff);
			// Keep pending fixtures pending, without writing the same status on every run.
			if (result.status === "unknown" || (!terminal && !changed)) {
				continue;
			}
			const update = await db.rpc("settle_event", {
				p_event_id: candidate.id,
				p_status: result.status,
				p_home: result.home,
				p_away: result.away,
				p_kickoff: result.kickoff,
			});
			if (update.error) {
				throw new Error(update.error.message);
			}
			updated++;
			if (update.data === true) {
				settled++;
			}
		} catch (error) {
			errors.push(
				`${candidate.external_id}: ${error instanceof Error ? error.message : "Błąd wyniku"}`,
			);
		}
	}
	if (errors.length) {
		throw new ResultsFailure(errors.join("; ").slice(0, 2000), candidates.length, updated);
	}
	return {
		value: { checked: candidates.length, updated, settled, missing, days: dates.size },
		found: candidates.length,
		saved: updated,
	};
}
