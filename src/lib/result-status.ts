import type { Coupon, EventRow, Selection } from "@lib/models";
import { winningSelections } from "@lib/odds";

export type ResultState = "pending" | "won" | "lost" | "void" | "live-won" | "live-lost";

export function selectionResult(
	result: string,
	selection: Selection,
	event: EventRow,
): ResultState {
	if (result === "won" || result === "lost" || result === "void") {
		return result;
	}
	// These markets use regulation time; an extra-time/penalty score is not comparable.
	if (
		event.status !== "live" ||
		["overtime", "extra_time", "penalties"].includes(event.match_phase ?? "") ||
		event.live_home_score === null ||
		event.live_away_score === null
	) {
		return "pending";
	}
	return winningSelections(event.live_home_score, event.live_away_score).includes(selection)
		? "live-won"
		: "live-lost";
}

export function couponResult(
	coupon: Pick<Coupon, "status" | "settled_at">,
	items: ResultState[],
): ResultState {
	if (coupon.settled_at && ["won", "lost", "void"].includes(coupon.status)) {
		return coupon.status as "won" | "lost" | "void";
	}
	if (items.includes("lost")) {
		return "lost";
	}
	if (items.includes("live-lost")) {
		return "live-lost";
	}
	if (
		items.length &&
		items.every((state) => ["won", "void", "live-won"].includes(state)) &&
		items.includes("live-won")
	) {
		return "live-won";
	}
	return "pending";
}
