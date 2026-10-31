import { importerClient } from "./supabase.js";
import { MeczykiClient } from "@lib/collector/meczyki-client";
import { loadStoredTeams, syncTeamLogos } from "@lib/collector/team-repository";

async function main() {
	const db = importerClient();
	const client = new MeczykiClient(
		Number(process.env.REQUEST_DELAY_MS ?? 350),
		Number(process.env.RETRIES ?? 3),
	);
	const teams = await loadStoredTeams(db);
	console.log(`Zapisane drużyny: ${teams.length}.`);
	const summary = await syncTeamLogos(db, teams, client);
	if (summary.failed) {
		process.exitCode = 1;
	}
}
main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
