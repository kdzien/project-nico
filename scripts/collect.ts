import { resolve } from "node:path";
import { adminClient } from "./admin.js";
import { calendarDate, validDate } from "../src/lib/dates.js";
import { MeczykiClient } from "../src/lib/collector/meczyki-client.js";
import { collectMatches } from "../src/lib/collector/collect.js";
import { JsonRepository } from "../src/lib/collector/json-repository.js";
import { SupabaseRepository } from "../src/lib/collector/supabase-repository.js";
import { withImportRun } from "../src/lib/collector/import-run.js";

async function main() {
  const date = process.env.TARGET_DATE ?? calendarDate();
  if (!validDate(date)) throw new Error("TARGET_DATE musi mieć format YYYY-MM-DD.");
  const max = process.env.MAX_MATCHES ? Number(process.env.MAX_MATCHES) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1)) throw new Error("MAX_MATCHES musi być dodatnią liczbą całkowitą.");
  const client = new MeczykiClient(Number(process.env.REQUEST_DELAY_MS ?? 350), Number(process.env.RETRIES ?? 3));
  const collect = () => collectMatches(date, client, max);
  const document = process.env.COLLECT_OUTPUT === "json" ? await collect() : await (async () => {
    const db = adminClient();
    return withImportRun(db, "events", date, async () => {
      const value = await collect();
      await new SupabaseRepository(db).save(value);
      return { value, found: value.matches.length, saved: value.matches.length };
    });
  })();
  if (process.env.COLLECT_OUTPUT === "json" || process.env.OUTPUT_PATH) {
    const path = resolve(process.env.OUTPUT_PATH ?? `outputs/matches-${date}.json`);
    console.log(`Zapisano: ${await new JsonRepository(path).save(document)}`);
  }
  console.log(`Import zakończony: ${document.matches.length} wydarzeń (${date}).`);
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
