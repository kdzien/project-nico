import type { Competition, CompetitionMetadata } from "@lib/collector/types";

function integer(value: unknown, minimum: number): number | null {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
		? value
		: null;
}

function text(value: unknown): string | null {
	return typeof value === "string" ? value.trim() || null : null;
}

export function competitionMetadata(competition: Competition): CompetitionMetadata {
	return {
		competition_id: integer(competition.id, 1),
		competition_slug: text(competition.slug),
		competition_type: text(competition.type),
		competition_level: integer(competition.countryGameLevel, 1),
		competition_display_order: integer(competition.displayOrder, 0),
		country_id: integer(competition.country?.id, 1),
		country: text(competition.country?.displayName),
		country_slug: text(competition.country?.slug),
	};
}
