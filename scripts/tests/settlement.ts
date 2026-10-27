import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "../admin.js";

const admin = adminClient();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!/^http:\/\/(127\.0\.0\.1|localhost):55321$/.test(url)) throw new Error("Testy tylko na lokalnej bazie Nico.");
const owner = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const events: string[] = [];
let userId: string | undefined;
const future = new Date(Date.now() + 86400000).toISOString();
let externalId = -Date.now();
async function event() {
  const { data, error } = await admin.from("events").insert({ external_id: externalId--, kickoff: future, competition: "Test rozliczeń", home_team: "A", away_team: "B", odds: { "1": 2, X: 3, "2": 4, "1X": 1.2, "2X": 1.7 } }).select().single();
  assert.ifError(error); events.push(data.id); return data.id as string;
}
async function coupon(items: { event_id: string; selection: string; odds_at_add: number }[], finalize = true) {
  const { data, error } = await owner.rpc("save_coupon", { p_id: null, p_name: "Test rozliczeń", p_stake: null, p_items: items, p_finalize: finalize });
  assert.ifError(error); return data as string;
}
const settle = (id: string, status: string, home: number | null, away: number | null) => admin.rpc("settle_event", { p_event_id: id, p_status: status, p_home: home, p_away: away, p_kickoff: future });
async function read(id: string) {
  const result = await owner.from("coupons").select("*,coupon_items(*)").eq("id", id).single();
  assert.ifError(result.error); return result.data;
}
try {
  const email = `settlement-${randomUUID()}@nico.test`; const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error); userId = created.data.user!.id;
  assert.ifError((await owner.auth.signInWithPassword({ email, password })).error);
  const selections = ["1", "X", "2", "1X", "2X"];
  for (const [home, away, outcomes] of [[2, 1, [true, false, false, true, false]], [1, 1, [false, true, false, true, true]], [0, 1, [false, false, true, false, true]]] as const) {
    const id = await event();
    const coupons = [];
    for (const selection of selections) coupons.push(await coupon([{ event_id: id, selection, odds_at_add: 2 }]));
    assert.ok((await owner.rpc("settle_event", { p_event_id: id, p_status: "finished", p_home: home, p_away: away, p_kickoff: future })).error);
    const replies = await Promise.all([settle(id, "finished", home, away), settle(id, "finished", home, away)]);
    replies.forEach((reply) => assert.ifError(reply.error));
    assert.equal(replies.filter((reply) => reply.data === true).length, 1);
    for (const [index, couponId] of coupons.entries()) {
      const saved = await read(couponId);
      const expected = outcomes[index] ? "won" : "lost";
      assert.equal(saved.status, expected);
      assert.equal(saved.coupon_items[0].result, expected);
      assert.equal(Number(saved.coupon_items[0].odds_at_add), 2);
      assert.ok(saved.settled_at);
    }
    const previous = await read(coupons[0]!);
    assert.equal((await settle(id, "finished", 99, 0)).data, false);
    assert.equal((await read(coupons[0]!)).settled_at, previous.settled_at);
    // Even a stale import cannot undo the terminal status or score.
    assert.ifError((await admin.from("events").update({ status: "scheduled", home_score: null, away_score: null, settled_at: null }).eq("id", id)).error);
    const frozen = await admin.from("events").select().eq("id", id).single();
    assert.equal(frozen.data.status, "finished"); assert.equal(frozen.data.home_score, home);
  }
  const cancelled = await event(); const regular = await event();
  const voidCoupon = await coupon([{ event_id: cancelled, selection: "1", odds_at_add: 3 }]);
  const mixed = await coupon([{ event_id: cancelled, selection: "X", odds_at_add: 3 }, { event_id: regular, selection: "1", odds_at_add: 2 }]);
  assert.ifError((await settle(cancelled, "cancelled", null, null)).error);
  assert.equal((await read(voidCoupon)).status, "void");
  assert.equal(Number((await read(voidCoupon)).combined_odds), 1);
  assert.equal((await read(mixed)).status, "placed");
  assert.equal(Number((await read(mixed)).combined_odds), 2);
  assert.ifError((await settle(regular, "finished", 1, 0)).error);
  assert.equal((await read(mixed)).status, "won");
  const firstLoss = await event(); const pendingEvent = await event();
  const losing = await coupon([{ event_id: firstLoss, selection: "1", odds_at_add: 2 }, { event_id: pendingEvent, selection: "1X", odds_at_add: 2 }]);
  assert.ifError((await settle(firstLoss, "finished", 0, 1)).error);
  assert.equal((await read(losing)).status, "lost");
  assert.equal((await read(losing)).settled_at, null);
  assert.ifError((await settle(pendingEvent, "finished", 1, 1)).error);
  assert.equal((await read(losing)).status, "lost");
  assert.ok((await read(losing)).settled_at);
  const later = await event(); const unresolved = await coupon([{ event_id: later, selection: "X", odds_at_add: 3 }]);
  const draft = await coupon([{ event_id: later, selection: "X", odds_at_add: 3 }], false);
  assert.ifError((await settle(later, "postponed", null, null)).error);
  assert.equal((await read(unresolved)).coupon_items[0].result, "pending");
  assert.ifError((await settle(later, "finished", null, null)).error);
  assert.equal((await read(unresolved)).status, "placed");
  assert.equal((await admin.from("events").select().eq("id", later).single()).data.settled_at, null);
  assert.ifError((await settle(later, "finished", 2, 2)).error);
  assert.equal((await read(unresolved)).status, "won");
  assert.equal((await read(draft)).status, "draft");
  assert.equal((await read(draft)).coupon_items[0].result, "pending");
  assert.ok((await owner.rpc("save_coupon", { p_id: draft, p_name: "Zamknięcie po wyniku", p_stake: null, p_items: [{ event_id: later, selection: "X", odds_at_add: 3 }], p_finalize: true })).error);
  console.log("OK: 1/X/2/1X/2X, zwroty, przełożenie, brak wyniku, wersje robocze, atomowość i równoległe ponowienie rozliczenia.");
} finally {
  if (userId) assert.ifError((await admin.auth.admin.deleteUser(userId)).error);
  if (events.length) assert.ifError((await admin.from("events").delete().in("id", events)).error);
}
