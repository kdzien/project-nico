import { randomInt } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { runResults } from "./results-run.js";

const stop = new AbortController();
let stopping = false;
function shutdown() {
	if (stopping) {
		process.exit(130);
	}
	stopping = true;
	stop.abort();
	console.log("Zatrzymywanie — bieżąca aktualizacja zostanie dokończona.");
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
	console.log("Aktualizacja wyników w losowych odstępach 5–10 minut. Zatrzymanie: Ctrl+C.");
	while (!stopping) {
		try {
			await runResults();
		} catch (error) {
			console.error(error instanceof Error ? error.message : error);
		}
		if (stopping) {
			break;
		}
		const minutes = randomInt(5, 11);
		const waitMs = minutes * 60 * 1000;
		const next = Date.now() + waitMs;
		console.log(
			`Następna aktualizacja za ${minutes} min: ${new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", timeStyle: "medium" }).format(new Date(next))}.`,
		);
		try {
			await delay(waitMs, undefined, { signal: stop.signal });
		} catch (error) {
			if (!stopping) {
				throw error;
			}
		}
	}
}
main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
