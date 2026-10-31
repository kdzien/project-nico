import { resolve } from "node:path";
import { importerClient } from "./supabase.js";
import { calendarDate, validDate } from "@lib/dates";
import { MeczykiClient } from "@lib/collector/meczyki-client";
import { collectMatches } from "@lib/collector/collect";
import { JsonRepository } from "@lib/collector/json-repository";
import { SupabaseRepository } from "@lib/collector/supabase-repository";
import { withImportRun } from "@lib/collector/import-run";

async function main() {
	const date = process.env.TARGET_DATE ?? calendarDate();
	if (!validDate(date)) {
		throw new Error("TARGET_DATE musi mieć format YYYY-MM-DD.");
	}
	const max = process.env.MAX_MATCHES ? Number(process.env.MAX_MATCHES) : null;
	if (max !== null && (!Number.isInteger(max) || max < 1)) {
		throw new Error("MAX_MATCHES musi być dodatnią liczbą całkowitą.");
	}
	const client = new MeczykiClient(
		Number(process.env.REQUEST_DELAY_MS ?? 350),
		Number(process.env.RETRIES ?? 3),
	);
	const collect = () => collectMatches(date, client, max);
	const document =
		process.env.COLLECT_OUTPUT === "json"
			? await collect()
			: await (async () => {
					const db = importerClient();
					return withImportRun(db, "events", date, async () => {
						const value = await collect();
						await new SupabaseRepository(db, client).save(value);
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
