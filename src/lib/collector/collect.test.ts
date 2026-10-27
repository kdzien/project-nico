import { describe, it, expect } from "vitest";
import { selectOdds } from "./collect";
import { eventRecord } from "./supabase-repository";
import type { CollectedMatch, ApiOdds } from "./types";

const odds = (homeOdds: number, tieOdds: number, awayOdds: number): ApiOdds => ({ matchItem: { id: 1 }, homeOdds, tieOdds, awayOdds, bookie: { name: "Nie utrwalaj" } });
describe("mapowanie importu", () => {
  it("wybiera kompletny skończony zestaw z jednego rekordu", () => {
    expect(selectOdds([odds(2, 0, 4), odds(Infinity, 3, 4), odds(2, 3, 4), odds(3, 4, 5)])).toEqual({ "1": 2, X: 3, "2": 4, "1X": 1.2, "2X": 1.71 });
    expect(selectOdds([odds(2, 0, 4)])).toEqual({ "1": null, X: null, "2": null, "1X": null, "2X": null });
  });
  it("mapuje do kolumn i statystyk bez danych źródła kursów", () => {
    const team = { participant_id: 1, name: "A", table: null, last_matches: [] };
    const match: CollectedMatch = { status: "scheduled", match_id: 123, kickoff: "2026-10-26T18:00:00Z", competition: "Liga", round: null, home: team, away: { ...team, name: "B" }, odds: selectOdds([odds(2, 3, 4)]), h2h: { summary: { matches: 0, home_wins: 0, away_wins: 0, draws: 0, home_goals: 0, away_goals: 0 }, last_matches: [] } };
    const row = eventRecord(match, "2026-10-26T12:00:00Z");
    expect(row).toMatchObject({ provider: "meczyki", external_id: 123, home_team: "A", away_team: "B", odds: { "1": 2 } });
    expect(row.statistics.home.last_matches).toEqual([]);
    expect(JSON.stringify(row)).not.toContain("Nie utrwalaj");
  });
});

it("zachowuje całą zakończoną historię i liczy H2H w rolach bieżących drużyn", async () => {
  const { MeczykiClient } = await import("./meczyki-client");
  const { collectMatches } = await import("./collect");
  const { vi } = await import("vitest");
  const client = new MeczykiClient(0, 0);
  const current = { id: 100, startTime: "2026-10-27T18:00:00+01:00", normalizedSeason: 2026, status: "not_started", competition: { id: 1, displayName: "Liga" }, homeParticipant: { id: 1, displayName: "A", competition: { id: 1, displayName: "Liga" } }, awayParticipant: { id: 2, displayName: "B", competition: { id: 1, displayName: "Liga" } }, homeScore: null, awayScore: null };
  const history = Array.from({ length: 8 }, (_, i) => ({ ...current, id: i, status: "finished", homeParticipant: current.awayParticipant, awayParticipant: current.homeParticipant, homeScore: 0, awayScore: 2 }));
  vi.spyOn(client, "getMatches").mockResolvedValue([current]);
  vi.spyOn(client, "getOdds").mockResolvedValue([]);
  vi.spyOn(client, "getParticipantMatches").mockResolvedValue([...history, current]);
  vi.spyOn(client, "getHeadToHead").mockResolvedValue([...history, current]);
  const standings = vi.spyOn(client, "getStandings").mockResolvedValue([{ participant: { id: 1, competitionPosition: 4 }, points: 10 }, { participant: { id: 2 }, displayOrder: 7, points: 3 }]);
  const saved = await collectMatches("2026-10-27", client);
  const match = saved.matches[0]!;
  expect(match.home.last_matches).toHaveLength(8);
  expect(match.away.last_matches).toHaveLength(8);
  expect(match.h2h.last_matches).toHaveLength(8);
  expect(match.h2h.summary).toMatchObject({ home_wins: 8, home_goals: 16, away_goals: 0 });
  expect(match.home.table?.position).toBe(4);
  expect(match.away.table?.position).toBe(7);
  expect(standings).toHaveBeenCalledTimes(1);
});
