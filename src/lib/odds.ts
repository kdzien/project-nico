import type { Selection } from "@lib/models";

export function roundOdds(value: number): number {
	return Math.round(value * 100) / 100;
}

export function doubleChance(first: number | null, draw: number | null): number | null {
	if (first === null || draw === null || first <= 1 || draw <= 1) {
		return null;
	}
	return roundOdds(1 / (1 / first + 1 / draw));
}

export function winningSelections(homeScore: number | null, awayScore: number | null): Selection[] {
	if (homeScore === null || awayScore === null) {
		return [];
	}
	if (homeScore > awayScore) {
		return ["1", "1X"];
	}
	if (homeScore < awayScore) {
		return ["2", "2X"];
	}
	return ["X", "1X", "2X"];
}
