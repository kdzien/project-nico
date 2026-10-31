import { importerClient } from "./supabase.js";
import { calendarDate, validDate } from "@lib/dates";
import { MeczykiClient } from "@lib/collector/meczyki-client";
import { withImportRun } from "@lib/collector/import-run";
import { refreshResults } from "@lib/collector/results";

export async function runResults() {
	const date = process.env.TARGET_DATE;
	if (date !== undefined && !validDate(date)) {
		throw new Error("TARGET_DATE musi mieć format YYYY-MM-DD.");
	}
	const now = new Date();
	const db = importerClient();
	const client = new MeczykiClient(
		Number(process.env.REQUEST_DELAY_MS ?? 350),
		Number(process.env.RETRIES ?? 3),
	);
	const summary = await withImportRun(db, "results", date ?? calendarDate(now), () =>
		refreshResults(db, client, { now, ...(date ? { date } : {}) }),
	);
	console.log(
		`Sprawdzono ${summary.checked} wydarzeń z ${summary.days} dni. Zaktualizowano: ${summary.updated}, rozliczono: ${summary.settled}, brak na listach: ${summary.missing}. Rozliczono pozycji kuponów: ${summary.itemsSettled}, całych kuponów: ${summary.couponsSettled}.`,
	);
}
