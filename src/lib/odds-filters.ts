import type { EventRow, Selection } from "@lib/models";

export const oddsComparisons = ["between", "lt", "lte", "gt", "gte", "eq"] as const;
export type OddsComparison = (typeof oddsComparisons)[number];
export type OddsFilterMode = "all" | "any";

export interface OddsFilterRule {
	id: number;
	selection: Selection;
	comparison: OddsComparison;
	from: string;
	to: string;
}

interface OddsCondition {
	selection: Selection;
	comparison: OddsComparison;
	from: number | null;
	to: number | null;
}

interface ParsedOddsRule {
	condition: OddsCondition | null;
	error: "invalidNumber" | "invalidRange" | null;
}

function readNumber(value: string): number | null {
	const normalized = value.trim().replace(",", ".");
	if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
		return null;
	}
	const number = Number(normalized);
	return Number.isFinite(number) && number >= 0 ? number : null;
}

export function parseOddsRule(rule: OddsFilterRule): ParsedOddsRule {
	const hasFrom = rule.from.trim() !== "";
	const hasTo = rule.comparison === "between" && rule.to.trim() !== "";
	const from = hasFrom ? readNumber(rule.from) : null;
	const to = hasTo ? readNumber(rule.to) : null;

	if ((hasFrom && from === null) || (hasTo && to === null)) {
		return { condition: null, error: "invalidNumber" };
	}
	if (from !== null && to !== null && from > to) {
		return { condition: null, error: "invalidRange" };
	}
	if (from === null && to === null) {
		return { condition: null, error: null };
	}

	return {
		condition: { selection: rule.selection, comparison: rule.comparison, from, to },
		error: null,
	};
}

export function matchesOddsFilters(
	odds: EventRow["odds"],
	conditions: OddsCondition[],
	mode: OddsFilterMode,
): boolean {
	if (!conditions.length) {
		return true;
	}

	function matches(condition: OddsCondition) {
		const value = odds[condition.selection];
		if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
			return false;
		}

		const { from, to } = condition;
		switch (condition.comparison) {
			case "between":
				return (from === null || value >= from) && (to === null || value <= to);
			case "lt":
				return from !== null && value < from;
			case "lte":
				return from !== null && value <= from;
			case "gt":
				return from !== null && value > from;
			case "gte":
				return from !== null && value >= from;
			case "eq":
				return from !== null && value === from;
		}
	}

	return mode === "all" ? conditions.every(matches) : conditions.some(matches);
}
