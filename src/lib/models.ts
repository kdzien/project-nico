import type { CollectedMatch, CollectedTeam, CompetitionMetadata } from "@lib/collector/types";
export const selections = ["1", "1X", "X", "2X", "2"] as const;
export type Selection = (typeof selections)[number];
export interface EventRow extends CompetitionMetadata {
	id: string;
	external_id: number;
	kickoff: string;
	competition: string;
	round: string | null;
	home_team_id: string | null;
	away_team_id: string | null;
	home_team_record?: { logo_hash: string | null } | null;
	away_team_record?: { logo_hash: string | null } | null;
	home_team: string;
	away_team: string;
	status: string;
	home_score: number | null;
	away_score: number | null;
	live_home_score: number | null;
	live_away_score: number | null;
	match_minute: string | null;
	match_phase: string | null;
	result_checked_at: string | null;
	odds: CollectedMatch["odds"];
	statistics: { home?: CollectedTeam; away?: CollectedTeam; h2h?: CollectedMatch["h2h"] };
}
export interface CouponItem {
	id: string;
	event_id: string;
	selection: Selection;
	odds_at_add: number;
	result: string;
	events: EventRow;
}
export interface Coupon {
	id: string;
	name: string;
	stake: number | null;
	combined_odds: number;
	status: string;
	created_at: string;
	settled_at: string | null;
	coupon_items: CouponItem[];
}
export interface DraftItem {
	result?: string;
	event_id: string;
	selection: Selection;
	odds_at_add: number;
	event: EventRow;
}

export interface CouponDraft {
	key: string;
	id: string | null;
	name: string;
	stake: string;
	items: DraftItem[];
	revision: number;
	change: "items" | "stake";
}
