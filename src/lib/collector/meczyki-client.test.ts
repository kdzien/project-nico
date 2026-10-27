import { afterEach, expect, it, vi } from "vitest";
import { MeczykiClient } from "./meczyki-client";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("ponawia 429 i 5xx, a błędów 4xx nie ponawia", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "0" } }))
    .mockResolvedValueOnce(new Response(null, { status: 503, headers: { "retry-after": "0" } }))
    .mockResolvedValueOnce(Response.json({ data: { id: 1 } }));
  vi.stubGlobal("fetch", fetcher);
  expect(await new MeczykiClient(0, 2).getMatch(1)).toEqual({ id: 1 });
  expect(fetcher).toHaveBeenCalledTimes(3);
  fetcher.mockReset().mockResolvedValue(new Response(null, { status: 404 }));
  await expect(new MeczykiClient(0, 3).getMatch(1)).rejects.toThrow("HTTP 404");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("kolejkuje odstępy także przy równoległych wywołaniach", async () => {
  vi.useFakeTimers();
  const times: number[] = [];
  vi.stubGlobal("fetch", vi.fn(async () => { times.push(Date.now()); return Response.json({ data: [] }); }));
  const client = new MeczykiClient(350, 0);
  const work = Promise.all([client.getOdds(1), client.getOdds(2), client.getOdds(3)]);
  await vi.runAllTimersAsync();
  await work;
  expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(350);
  expect(times[2]! - times[1]!).toBeGreaterThanOrEqual(350);
});
it("pobiera strony aż do krótszej odpowiedzi i wykrywa zapętloną paginację", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ data: [{ id: 1 }, { id: 2 }] })).mockResolvedValueOnce(Response.json({ data: [{ id: 3 }] }));
  vi.stubGlobal("fetch", fetcher);
  expect((await new MeczykiClient(0, 0).getMatches("2026-10-26", 2)).map((match) => match.id)).toEqual([1, 2, 3]);
  expect(fetcher.mock.calls[1]?.[0]).toContain("page=2");
  fetcher.mockReset().mockImplementation(async () => Response.json({ data: [{ id: 1 }] }));
  await expect(new MeczykiClient(0, 0).getMatches("2026-10-26", 1)).rejects.toThrow("powtórzyło");
});
