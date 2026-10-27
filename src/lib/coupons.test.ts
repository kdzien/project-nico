import { expect, it } from "vitest";
import { couponInput, combinedOdds } from "./coupons";
it("liczy kurs z zapisanych pozycji i odrzuca powtórzony mecz", () => {
  expect(combinedOdds([{ odds_at_add: 2 }, { odds_at_add: 1.5 }])).toBe(3);
  const item = { event_id: "9f489f37-1001-4c14-a665-bc85249dbd9d", selection: "1", odds_at_add: 2 };
  expect(couponInput.safeParse({ id: null, name: "Test", stake: null, items: [item, item], finalize: false }).success).toBe(false);
});
