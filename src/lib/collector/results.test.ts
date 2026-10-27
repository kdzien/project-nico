import { expect, it } from "vitest";
import { matchResult } from "./results";
const match = { id: 1, status: "finished", startTime: "2026-10-26T18:00:00+01:00", homeScore: 4, awayScore: 3, withOvertime: true };
it("rozlicza regulaminowy wynik zamiast dogrywki i karnych", () => {
  expect(matchResult({ ...match, attributes: [{ type: "home_regular_time_score", value: "1" }, { type: "away_regular_time_score", value: "1" }] })).toMatchObject({ status: "finished", home: 1, away: 1 });
});
it("nie zgaduje wyniku przy brakujących lub niepoprawnych danych", () => {
  expect(matchResult(match)).toMatchObject({ home: null, away: null });
  expect(matchResult({ ...match, withOvertime: false })).toMatchObject({ home: 4, away: 3 });
  expect(matchResult({ ...match, withOvertime: false, attributes: [{ type: "home_regular_time_score", value: "" }, { type: "away_regular_time_score", value: "0" }] })).toMatchObject({ home: null, away: 0 });
  expect(matchResult({ ...match, status: "postponed" })).toMatchObject({ status: "postponed", home: null, away: null });
  expect(matchResult({ ...match, status: "second_half" })).toMatchObject({ status: "live", home: null, away: null });
  expect(() => matchResult({ ...match, id: undefined })).toThrow();
});
