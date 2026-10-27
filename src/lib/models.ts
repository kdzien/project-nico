import type { CollectedMatch, CollectedTeam } from "./collector/types";
export const selections = ["1", "X", "2", "1X", "2X"] as const;
export type Selection = typeof selections[number];
export interface EventRow {
  id: string;
  external_id: number;
  kickoff: string;
  competition: string;
  round: string | null;
  home_team: string;
  away_team: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  odds: CollectedMatch["odds"];
  statistics: { home?: CollectedTeam; away?: CollectedTeam; h2h?: CollectedMatch["h2h"] };
}
export const statusLabels: Record<string, string> = {
  scheduled: "Zaplanowany", live: "W trakcie", finished: "Zakończony",
  cancelled: "Anulowany", postponed: "Przełożony", unknown: "Nieznany status",
  draft: "Roboczy", placed: "Do rozliczenia", pending: "Oczekuje", won: "Wygrany", lost: "Przegrany", void: "Zwrot",
};
export function statusLabel(status: string) { return statusLabels[status] ?? status; }

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
  coupon_items: CouponItem[];
}
export interface DraftItem { event_id: string; selection: Selection; odds_at_add: number; event: EventRow }
