import { describe, expect, it } from "vitest";
import { doubleChance, roundOdds } from "./odds";

describe("odds helpers", () => {
  it("rounds odds to two decimal places", () => {
    expect(roundOdds(1.666)).toBe(1.67);
  });

  it("calculates double chance from two source odds", () => {
    expect(doubleChance(3, 3.7)).toBe(1.66);
    expect(doubleChance(2.3, 3.7)).toBe(1.42);
  });

  it("rejects missing or invalid odds", () => {
    expect(doubleChance(null, 3.7)).toBeNull();
    expect(doubleChance(1, 3.7)).toBeNull();
  });
});
