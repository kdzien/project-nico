import { expect, it } from "vitest";
import { eventStatus } from "./status";
it("mapuje stany API i zachowuje nieznany stan jako nierozstrzygnięty", () => {
  expect(eventStatus("not_started")).toBe("scheduled");
  expect(eventStatus("second_half")).toBe("live");
  expect(eventStatus("postponed")).toBe("postponed");
  expect(eventStatus("new_provider_status")).toBe("unknown");
});
