import { expect, it } from "vitest";
import { calendarDate, dayBounds, validDate } from "./dates";
it("wyznacza dzień warszawski i granice podczas obu zmian czasu", () => {
  expect(calendarDate(new Date("2026-10-26T23:30:00Z"))).toBe("2026-10-27");
  expect(dayBounds("2026-03-29")).toEqual(["2026-03-28T23:00:00.000Z", "2026-03-29T22:00:00.000Z"]);
  expect(dayBounds("2026-10-25")).toEqual(["2026-10-24T22:00:00.000Z", "2026-10-25T23:00:00.000Z"]);
  expect(validDate("2026-02-30")).toBe(false);
});
