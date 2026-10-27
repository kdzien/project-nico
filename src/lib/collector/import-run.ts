import { ResultsFailure } from "./results.js";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function withImportRun<T>(
  db: SupabaseClient, kind: "events" | "results", date: string,
  work: () => Promise<{ value: T; found: number; saved: number }>,
): Promise<T> {
  const run = await db.from("import_runs").insert({ kind, target_date: date }).select("id").single();
  if (run.error) throw new Error(`Historia importu: ${run.error.message}`);
  try {
    const result = await work();
    const { error } = await db.from("import_runs").update({
      status: "succeeded", finished_at: new Date().toISOString(), events_found: result.found, events_saved: result.saved,
    }).eq("id", run.data.id);
    if (error) throw new Error(`Zakończenie importu: ${error.message}`);
    return result.value;
  } catch (error) {
    const failure = await db.from("import_runs").update({
      status: "failed", finished_at: new Date().toISOString(),
      events_found: error instanceof ResultsFailure ? error.found : 0,
      events_saved: error instanceof ResultsFailure ? error.saved : 0,
      error_message: (error instanceof Error ? error.message : "Nieznany błąd").slice(0, 2000),
    }).eq("id", run.data.id);
    if (failure.error) throw new AggregateError([error, failure.error], "Import i zapis błędu nie powiodły się.");
    throw error;
  }
}
