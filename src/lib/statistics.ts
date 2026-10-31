import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarDate } from "@lib/dates";
import { selections, type Selection } from "@lib/models";

export interface StatisticsCoupon {
	id: string;
	status: string;
	stake: number | null;
	combined_odds: number;
	settled_at: string | null;
	coupon_items: {
		selection: Selection;
		odds_at_add: number;
		result: string;
		events: { competition_id: number | null; competition: string; country: string | null };
	}[];
}

export interface OutcomeGroup {
	key: string;
	label: string;
	won: number;
	lost: number;
	void: number;
	pending: number;
}

export interface BalancePoint {
	date: string;
	balance: number;
}

export const oddsBuckets = [
	{ key: "under15", min: null, max: 1.5 },
	{ key: "15to2", min: 1.5, max: 2 },
	{ key: "2to3", min: 2, max: 3 },
	{ key: "3to5", min: 3, max: 5 },
	{ key: "over5", min: 5, max: null },
] as const;

function outcomeGroup(key: string, label = key): OutcomeGroup {
	return { key, label, won: 0, lost: 0, void: 0, pending: 0 };
}

function countOutcome(group: OutcomeGroup, result: string) {
	if (result === "won" || result === "lost" || result === "void") {
		group[result]++;
	} else {
		group.pending++;
	}
}

export async function loadStatisticsCoupons(db: SupabaseClient): Promise<StatisticsCoupon[]> {
	const coupons: StatisticsCoupon[] = [];
	for (let offset = 0; ; offset += 100) {
		const { data, error } = await db
			.from("coupons")
			.select(
				"id,status,stake,combined_odds,settled_at,coupon_items(selection,odds_at_add,result,events(competition_id,competition,country))",
			)
			.order("id")
			.range(offset, offset + 99)
			.overrideTypes<StatisticsCoupon[], { merge: false }>();
		if (error) {
			throw new Error("Nie udało się odczytać statystyk kuponów.");
		}
		coupons.push(...data);
		if (data.length < 100) {
			return coupons;
		}
	}
}

export function couponStatistics(coupons: StatisticsCoupon[]) {
	let stake = 0;
	let winnings = 0;
	let refunds = 0;
	let pendingStake = 0;
	let settledStake = 0;
	let missingStake = 0;
	const outcomes = outcomeGroup("coupons");
	const bySelection = new Map(selections.map((pick) => [pick, outcomeGroup(pick)]));
	const byOdds = new Map(oddsBuckets.map((bucket) => [bucket.key, outcomeGroup(bucket.key)]));
	const byCompetition = new Map<string, OutcomeGroup>();
	const dailyBalance = new Map<string, number>();

	for (const coupon of coupons) {
		if (coupon.status === "draft" || !coupon.coupon_items.length) {
			continue;
		}
		const complete =
			coupon.settled_at !== null && ["won", "lost", "void"].includes(coupon.status);
		countOutcome(outcomes, complete ? coupon.status : "pending");
		for (const item of coupon.coupon_items) {
			countOutcome(bySelection.get(item.selection)!, item.result);
			const odds = Number(item.odds_at_add);
			const bucket = oddsBuckets.find(
				(range) =>
					(range.min === null || odds >= range.min) &&
					(range.max === null || odds < range.max),
			);
			if (bucket && Number.isFinite(odds) && odds > 0) {
				countOutcome(byOdds.get(bucket.key)!, item.result);
			}
			const event = item.events;
			const key =
				event.competition_id?.toString() ?? `${event.country ?? ""}:${event.competition}`;
			let group = byCompetition.get(key);
			if (!group) {
				group = outcomeGroup(
					key,
					[event.competition, event.country].filter(Boolean).join(" · "),
				);
				byCompetition.set(key, group);
			}
			countOutcome(group, item.result);
		}
		if (coupon.stake === null || !Number.isFinite(Number(coupon.stake))) {
			missingStake++;
			continue;
		}
		// Round each coupon to PLN cents before adding, as with an individual payout.
		const cents = Math.round(Number(coupon.stake) * 100);
		stake += cents;
		if (!complete) {
			pendingStake += cents;
			continue;
		}
		settledStake += cents;
		const payout =
			coupon.status === "won"
				? Math.round(cents * Number(coupon.combined_odds))
				: coupon.status === "void"
					? cents
					: 0;
		if (coupon.status === "won") {
			winnings += payout;
		} else if (coupon.status === "void") {
			refunds += payout;
		}
		const day = calendarDate(new Date(coupon.settled_at!));
		dailyBalance.set(day, (dailyBalance.get(day) ?? 0) + payout - cents);
	}
	let cumulative = 0;
	const timeline: BalancePoint[] = [...dailyBalance.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, change]) => {
			cumulative += change;
			return { date, balance: cumulative / 100 };
		});
	return {
		stake: stake / 100,
		winnings: winnings / 100,
		refunds: refunds / 100,
		pendingStake: pendingStake / 100,
		balance: (winnings + refunds - settledStake) / 100,
		missingStake,
		outcomes,
		timeline,
		bySelection: [...bySelection.values()],
		byOdds: [...byOdds.values()],
		byCompetition: [...byCompetition.values()].sort(
			(a, b) => b.won + b.lost - (a.won + a.lost) || a.label.localeCompare(b.label),
		),
	};
}

export type CouponStatistics = ReturnType<typeof couponStatistics>;
