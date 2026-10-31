import type { EventRow } from "@lib/models";

// Meczyki currently uses Polish country names/slugs; accept English variants too.
const preferredCountries = new Set([
	"polska",
	"poland",
	"anglia",
	"england",
	"niemcy",
	"germany",
	"deutschland",
	"francja",
	"france",
	"hiszpania",
	"spain",
	"espana",
	"portugalia",
	"portugal",
	"holandia",
	"niderlandy",
	"netherlands",
	"holland",
	"belgia",
	"belgium",
	"turcja",
	"turkey",
	"turkiye",
	"wlochy",
	"italy",
	"italia",
	"szkocja",
	"scotland",
	"austria",
	"osterreich",
	"szwajcaria",
	"switzerland",
	"schweiz",
	"suisse",
]);

function normalizeCountry(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/ł/g, "l")
		.replace(/[^a-z]/g, "");
}

export function isPreferredCompetition(event: EventRow): boolean {
	const preferredCountry = [event.country_slug, event.country].some(
		(value) => value !== null && preferredCountries.has(normalizeCountry(value)),
	);
	return (
		preferredCountry &&
		(event.competition_type === "cup" ||
			(event.competition_type === "league" &&
				(event.competition_level === 1 || event.competition_level === 2)))
	);
}

export function competitionKey(event: EventRow): string {
	return event.competition_id !== null
		? `id:${event.competition_id}`
		: `name:${event.country_slug ?? event.country ?? ""}:${event.competition}`;
}

export function compareCompetitions(a: EventRow, b: EventRow, locale: string): number {
	return (
		Number(isPreferredCompetition(b)) - Number(isPreferredCompetition(a)) ||
		(a.competition_display_order ?? Number.MAX_SAFE_INTEGER) -
			(b.competition_display_order ?? Number.MAX_SAFE_INTEGER) ||
		a.competition.localeCompare(b.competition, locale) ||
		(a.country ?? "").localeCompare(b.country ?? "", locale) ||
		competitionKey(a).localeCompare(competitionKey(b))
	);
}
