import { adminClient } from "./admin.js";
import { calendarDate } from "../src/lib/dates.js";
import { MeczykiClient } from "../src/lib/collector/meczyki-client.js";
import { withImportRun } from "../src/lib/collector/import-run.js";
import { refreshResults } from "../src/lib/collector/results.js";

async function main() {
  const db = adminClient();
  const client = new MeczykiClient(Number(process.env.REQUEST_DELAY_MS ?? 350), Number(process.env.RETRIES ?? 3));
  const saved = await withImportRun(db, "results", calendarDate(), () => refreshResults(db, client));
  console.log(`Odświeżono ${saved} wydarzeń. Wyniki i kupony rozliczono w bazie.`);
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
