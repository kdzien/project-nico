import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SupabaseRepository } from "../../src/lib/collector/supabase-repository.js";
import { withImportRun } from "../../src/lib/collector/import-run.js";
import type { CollectionDocument } from "../../src/lib/collector/types.js";
import { adminClient } from "../admin.js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!/^http:\/\/(127\.0\.0\.1|localhost):55321$/.test(url)) throw new Error("Testy zapisu są dozwolone tylko w lokalnym Nico.");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = adminClient();
const users: string[] = [];
const runIds: string[] = [];
let eventId: string | undefined;
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
try {
  const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  assert.equal(settingsResponse.status, 200);
  const settings = await settingsResponse.json();
  assert.equal(settings.disable_signup, true);
  assert.equal(settings.external.email, true);
  const sessions = [];
  for (let i = 0; i < 2; i++) {
    const email = `rls-${randomUUID()}@nico.test`;
    const password = randomUUID();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(created.error);
    users.push(created.data.user!.id);
    const db = client();
    assert.ifError((await db.auth.signInWithPassword({ email, password })).error);
    assert.ifError((await db.auth.refreshSession()).error);
    sessions.push(db);
  }
  const owner = sessions[0]!;
  const other = sessions[1]!;
  const anonymous = client();
  const event = await admin.from("events").insert({ external_id: -Date.now(), kickoff: new Date(Date.now() + 172800000).toISOString(), competition: "Test RLS", home_team: "A", away_team: "B" }).select().single();
  assert.ifError(event.error);
  eventId = event.data.id;
  const document: CollectionDocument = { date: "1900-01-01", timezone: "Europe/Warsaw", generated_at: new Date().toISOString(), matches: [{
    status: "scheduled", match_id: event.data.external_id, kickoff: event.data.kickoff, competition: "Test RLS", round: null,
    home: { participant_id: 1, name: "A", table: null, last_matches: [] },
    away: { participant_id: 2, name: "B", table: null, last_matches: [] },
    odds: { "1": 2, X: 3, "2": 4, "1X": 1.2, "2X": 1.71 },
    h2h: { summary: { matches: 0, home_wins: 0, away_wins: 0, draws: 0, home_goals: 0, away_goals: 0 }, last_matches: [] },
  }] };
  const repository = new SupabaseRepository(admin);
  await repository.save(document);
  await repository.save(document);
  const repeated = await admin.from("events").select().eq("external_id", event.data.external_id);
  assert.equal(repeated.data?.length, 1);
  assert.equal(repeated.data?.[0]?.id, eventId);
  const marker = randomUUID();
  const runStart = new Date().toISOString();
  try {
    await assert.rejects(() => withImportRun(admin, "events", "1900-01-01", async () => { throw new Error(marker); }), new RegExp(marker));
    const runs = await admin.from("import_runs").select().eq("target_date", "1900-01-01").gte("started_at", runStart);
    assert.ifError(runs.error);
    runIds.push(...runs.data!.map((run) => run.id));
    assert.ok(runs.data!.some((run) => run.status === "failed" && run.error_message === marker && run.finished_at));
  } finally {
    if (runIds.length) assert.ifError((await admin.from("import_runs").delete().in("id", runIds)).error);
  }
  assert.equal((await anonymous.from("events").select()).data, null);
  assert.equal((await owner.from("events").select().eq("id", eventId)).data?.length, 1);
  assert.ok((await owner.from("events").update({ competition: "niedozwolone" }).eq("id", eventId)).error);
  assert.ok((await owner.from("import_runs").insert({ target_date: "2026-10-26" })).error);
  const couponInput = { p_id: null as string | null, p_name: "Test izolacji", p_stake: 10, p_items: [{ event_id: eventId, selection: "1", odds_at_add: 2 }], p_finalize: false };
  const coupon = await owner.rpc("save_coupon", couponInput);
  assert.ifError(coupon.error);
  const couponId = coupon.data as string;
  assert.ok((await other.from("coupons").insert({ user_id: users[0], name: "Podszycie" })).error);
  assert.equal((await other.from("coupons").select().eq("id", couponId)).data?.length, 0);
  assert.ok((await other.from("coupons").update({ name: "Atak" }).eq("id", couponId)).error);
  assert.equal((await other.from("coupons").delete().eq("id", couponId).select()).data?.length, 0);
  const item = await owner.from("coupon_items").select().eq("coupon_id", couponId).single();
  assert.ifError(item.error);
  assert.equal((await other.from("coupon_items").select().eq("coupon_id", couponId)).data?.length, 0);
  assert.ok((await other.from("coupon_items").insert({ coupon_id: couponId, event_id: eventId, selection: "X", odds_at_add: 3 })).error);
  assert.ok((await other.from("coupon_items").update({ result: "won" }).eq("id", item.data.id)).error);
  assert.ok((await other.from("coupon_items").delete().eq("id", item.data.id)).error);
  assert.ok((await other.rpc("save_coupon", { ...couponInput, p_id: couponId })).error);
  assert.ok((await owner.rpc("save_coupon", { ...couponInput, p_id: couponId, p_items: [...couponInput.p_items, ...couponInput.p_items] })).error);
  assert.ok((await owner.rpc("save_coupon", { ...couponInput, p_id: couponId, p_items: [{ event_id: randomUUID(), selection: "1", odds_at_add: 2 }] })).error);
  assert.equal((await owner.from("coupon_items").select().eq("coupon_id", couponId)).data?.length, 1);
  assert.ifError((await admin.from("events").update({ odds: { "1": 9 } }).eq("id", eventId)).error);
  assert.ifError((await owner.rpc("save_coupon", { ...couponInput, p_id: couponId, p_items: [{ event_id: eventId, selection: "1", odds_at_add: 9 }] })).error);
  assert.equal(Number((await owner.from("coupon_items").select().eq("coupon_id", couponId).single()).data?.odds_at_add), 2);
  assert.ifError((await owner.rpc("save_coupon", { ...couponInput, p_id: couponId, p_finalize: true })).error);
  assert.ok((await owner.rpc("save_coupon", { ...couponInput, p_id: couponId })).error);
  assert.equal((await owner.from("coupons").select().eq("id", couponId).single()).data?.status, "placed");
  assert.equal((await owner.from("coupons").delete().eq("id", couponId).select()).data?.length, 1);
  assert.equal((await owner.from("coupon_items").select().eq("coupon_id", couponId)).data?.length, 0);
  assert.ifError((await owner.auth.signOut()).error);
  assert.equal((await owner.from("coupons").select()).data, null);
  console.log("OK: Auth, RLS, import, transakcyjny zapis kuponu, stałe kursy i blokada edycji.");
} finally {
  for (const id of users) assert.ifError((await admin.auth.admin.deleteUser(id)).error);
  if (eventId) assert.ifError((await admin.from("events").delete().eq("id", eventId)).error);
}
