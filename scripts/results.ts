import { adminClient } from "./admin.js";
import { calendarDate, validDate } from "../src/lib/dates.js";
import { MeczykiClient } from "../src/lib/collector/meczyki-client.js";
import { withImportRun } from "../src/lib/collector/import-run.js";
import { refreshResults } from "../src/lib/collector/results.js";

async function main() {
	const date = process.env.TARGET_DATE;
	if (date !== undefined && !validDate(date)) {
		throw new Error("TARGET_DATE musi mieć format YYYY-MM-DD.");
	}
	const now = new Date();
	const db = adminClient();
	const client = new MeczykiClient(
		Number(process.env.REQUEST_DELAY_MS ?? 350),
		Number(process.env.RETRIES ?? 3),
	);
	const summary = await withImportRun(db, "results", date ?? calendarDate(now), () =>
		refreshResults(db, client, { now, ...(date ? { date } : {}) }),
	);
	console.log(
		`Sprawdzono ${summary.checked} wydarzeń z ${summary.days} dni. Zaktualizowano: ${summary.updated}, rozliczono: ${summary.settled}, brak na listach: ${summary.missing}.`,
	);
}
main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
