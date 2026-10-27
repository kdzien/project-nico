import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MeczykiClient } from "./meczyki-client.js";
import { eventStatus } from "./status.js";

const score = z.number().int().nonnegative().nullable();
const resultSchema = z.object({
  id: z.number().int(), status: z.string(), startTime: z.iso.datetime({ offset: true }),
  homeScore: score.optional(), awayScore: score.optional(),
  withOvertime: z.boolean().optional(),
  attributes: z.array(z.object({ type: z.string(), value: z.union([z.string(), z.number(), z.null()]) })).optional(),
});
export function matchResult(raw: unknown) {
  const match = resultSchema.parse(raw);
  const status = eventStatus(match.status);
  const value = (type: string): number | null => {
    const raw = match.attributes?.find((attribute) => attribute.type === type)?.value;
    if (raw === undefined || raw === null || raw === "" || !/^\d+$/.test(String(raw))) return null;
    const n = Number(raw);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  };
  let home = value("home_regular_time_score");
  let away = value("away_regular_time_score");
  // Only an explicit absence of extra time makes the aggregate score unambiguous.
  // If regulation attributes are present but invalid, keep the result unresolved.
  const hasRegular = match.attributes?.some((a) => ["home_regular_time_score", "away_regular_time_score"].includes(a.type));
  if (!hasRegular && match.withOvertime === false) {
    home = match.homeScore ?? null;
    away = match.awayScore ?? null;
  }
  return { id: match.id, status, home: status === "finished" ? home : null, away: status === "finished" ? away : null, kickoff: match.startTime };
}

export class ResultsFailure extends Error {
  constructor(message: string, readonly found: number, readonly saved: number) { super(message); }
}

export async function refreshResults(db: SupabaseClient, client: MeczykiClient) {
  const candidates: { id: string; external_id: number }[] = [];
  // Load all pages before updates change the candidate set.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("events").select("id,external_id").eq("provider", "meczyki").is("settled_at", null).order("id").range(offset, offset + 499);
    if (error) throw new Error(`Lista wyników: ${error.message}`);
    candidates.push(...data);
    if (data.length < 500) break;
  }
  let saved = 0;
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      const result = matchResult(await client.getMatch(candidate.external_id));
      if (result.id !== candidate.external_id) throw new Error("ID odpowiedzi nie odpowiada wydarzeniu.");
      const update = await db.rpc("settle_event", { p_event_id: candidate.id, p_status: result.status, p_home: result.home, p_away: result.away, p_kickoff: result.kickoff });
      if (update.error) throw new Error(update.error.message);
      saved++;
    } catch (error) {
      errors.push(`${candidate.external_id}: ${error instanceof Error ? error.message : "Błąd pobrania"}`);
    }
  }
  if (errors.length) throw new ResultsFailure(errors.join("; ").slice(0, 2000), candidates.length, saved);
  return { value: saved, found: candidates.length, saved };
}
