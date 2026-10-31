import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeczykiClient } from "@lib/collector/meczyki-client";
import type { CollectedTeam, CollectionDocument } from "@lib/collector/types";

export interface StoredTeam {
	id: string;
	external_id: number;
	logo_hash: string | null;
	logo_checked_at: string | null;
	logo_source_url: string | null;
}

type LogoClient = Pick<MeczykiClient, "getTeamLogo" | "teamLogoUrl">;
const columns = "id,external_id,logo_hash,logo_checked_at,logo_source_url";

export async function syncTeamLogos(db: SupabaseClient, teams: StoredTeam[], client: LogoClient) {
	let downloaded = 0;
	let bytes = 0;
	let cached = 0;
	let missing = 0;
	let failed = 0;
	for (const [index, team] of teams.entries()) {
		if (team.logo_hash) {
			cached++;
			continue;
		}
		// Retry known missing logos after a week, rather than on every import.
		if (team.logo_checked_at && Date.now() - Date.parse(team.logo_checked_at) < 7 * 86400000) {
			missing++;
			continue;
		}
		try {
			const logo = await client.getTeamLogo(team.external_id);
			const hash = logo ? createHash("sha256").update(logo.data).digest("hex") : null;
			const { error } = await db
				.from("teams")
				.update({
					logo_checked_at: new Date().toISOString(),
					logo_source_url: client.teamLogoUrl(team.external_id),
					...(logo
						? {
								logo_data: `\\x${Buffer.from(logo.data).toString("hex")}`,
								logo_hash: hash,
							}
						: {}),
				})
				.eq("id", team.id)
				.is("logo_hash", null);
			if (error) {
				throw new Error(error.message);
			}
			team.logo_hash = hash;
			if (logo) {
				downloaded++;
				bytes += logo.data.length;
			} else {
				missing++;
			}
		} catch (error) {
			failed++;
			console.warn(
				`Herb drużyny ${team.external_id}: ${error instanceof Error ? error.message : "błąd pobrania"}`,
			);
		}
		if ((index + 1) % 25 === 0) {
			console.log(`Herby: ${index + 1}/${teams.length}.`);
		}
	}
	console.log(
		`Herby: pobrano ${downloaded} (${bytes} B), z cache ${cached}, brak ${missing}, błędy ${failed}.`,
	);
	return { downloaded, bytes, cached, missing, failed };
}

export async function syncTeams(
	db: SupabaseClient,
	document: CollectionDocument,
	client?: LogoClient,
): Promise<Map<number, StoredTeam>> {
	const participants = new Map<number, CollectedTeam>();
	for (const match of document.matches) {
		participants.set(match.home.participant_id, match.home);
		participants.set(match.away.participant_id, match.away);
	}
	const teams = [...participants.values()];
	const saved: StoredTeam[] = [];
	for (let offset = 0; offset < teams.length; offset += 200) {
		const { data, error } = await db
			.from("teams")
			.upsert(
				teams.slice(offset, offset + 200).map((team) => ({
					provider: "meczyki",
					external_id: team.participant_id,
					name: team.name,
					...(team.slug !== undefined ? { slug: team.slug } : {}),
					...(team.country !== undefined ? { country: team.country } : {}),
					...(team.logo_source_url !== undefined
						? { logo_source_url: team.logo_source_url }
						: {}),
				})),
				{ onConflict: "provider,external_id" },
			)
			.select(columns)
			.overrideTypes<StoredTeam[], { merge: false }>();
		if (error) {
			throw new Error(`Zapis drużyn: ${error.message}`);
		}
		saved.push(...data);
	}
	if (client) {
		const available = saved.filter(
			(team) => participants.get(team.external_id)?.logo_source_url !== null,
		);
		await syncTeamLogos(db, available, client);
	}
	return new Map(saved.map((team) => [team.external_id, team]));
}

export async function loadStoredTeams(db: SupabaseClient): Promise<StoredTeam[]> {
	const teams: StoredTeam[] = [];
	for (let offset = 0; ; offset += 500) {
		const { data, error } = await db
			.from("teams")
			.select(columns)
			.eq("provider", "meczyki")
			.order("id")
			.range(offset, offset + 499)
			.overrideTypes<StoredTeam[], { merge: false }>();
		if (error) {
			throw new Error(`Odczyt drużyn: ${error.message}`);
		}
		teams.push(...data);
		if (data.length < 500) {
			return teams;
		}
	}
}
