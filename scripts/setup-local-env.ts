import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

interface SupabaseStatus {
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
}

function readLocalStatus(): SupabaseStatus {
  const raw = execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(raw) as SupabaseStatus;
}

async function main(): Promise<void> {
  const status = readLocalStatus();
  const contents = [
    "# Wygenerowano przez npm run env:local. Tylko lokalny development.",
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
    `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
    "",
  ].join("\n");

  const target = resolve(".env.local");
  await writeFile(target, contents, { encoding: "utf8", mode: 0o600 });
  console.log(`Zapisano lokalną konfigurację: ${target}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
