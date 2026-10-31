import type { EventRow } from "@lib/models";

export type EventResult = Pick<
	EventRow,
	| "id"
	| "status"
	| "home_score"
	| "away_score"
	| "live_home_score"
	| "live_away_score"
	| "match_minute"
	| "match_phase"
	| "result_checked_at"
>;
export interface CouponResult {
	id: string;
	status: string;
	settled_at: string | null;
	combined_odds: number;
	coupon_items: { id: string; event_id: string; selection: string; result: string }[];
}
export interface ResultsSnapshot {
	events: EventResult[];
	coupons: CouponResult[];
}
export const resultColumns =
	"id,status,home_score,away_score,live_home_score,live_away_score,match_minute,match_phase,result_checked_at";

export function mergeEventResult(event: EventRow, result: EventResult | undefined): EventRow {
	if (
		!result ||
		Object.entries(result).every(([key, value]) => event[key as keyof EventRow] === value)
	) {
		return event;
	}
	return { ...event, ...result };
}
export function displayedScore(event: EventRow): [number, number] | null {
	if (event.status === "finished" && event.home_score !== null && event.away_score !== null) {
		return [event.home_score, event.away_score];
	}
	if (
		["live", "finished"].includes(event.status) &&
		event.live_home_score !== null &&
		event.live_away_score !== null
	) {
		return [event.live_home_score, event.live_away_score];
	}
	return null;
}
