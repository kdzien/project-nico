import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { type Coupon, statusLabel } from "@/lib/models";
import { AppHeader } from "@/components/app-header";
import { DeleteCoupon } from "@/components/delete-coupon";

export default async function CouponsPage() {
  const { db } = await requireUser();
  const coupons: Coupon[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.from("coupons").select("*,coupon_items(*,events(*))").order("created_at", { ascending: false }).order("id").range(offset, offset + 99);
    if (error) throw new Error("Nie udało się odczytać kuponów.");
    coupons.push(...data as Coupon[]);
    if (data.length < 100) break;
  }
  const results = await db.from("import_runs").select("status,finished_at").eq("kind", "results").order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (results.error) throw new Error("Nie udało się odczytać historii wyników.");
  return <main className="shell app-shell"><AppHeader /><section className="page-heading"><div><p className="eyebrow">MOJE KUPONY</p><h1>Twoje wybory, ich wyniki.</h1><p className="muted">Kursy pozycji są zachowane z chwili dodania.</p></div><Link className="button-link" href="/">+ Nowy kupon</Link></section>
    {results.data?.status === "failed" && <p role="alert" className="notice">Ostatnia aktualizacja wyników napotkała błąd. Część pozycji może nadal oczekiwać na rozliczenie.</p>}
    {results.data?.status === "running" && <p className="notice">Trwa aktualizacja wyników.</p>}
    {results.data?.status === "succeeded" && results.data.finished_at && <p className="muted">Wyniki zaktualizowane: {new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" }).format(new Date(results.data.finished_at))}</p>}
    {!coupons.length && <div className="empty">Nie masz jeszcze kuponów. Wybierz typy na ekranie wydarzeń.</div>}
    <div className="coupon-list">{coupons.map((coupon) => <article className="event-card" key={coupon.id}>
      <div className="event-meta"><span>{new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "medium" }).format(new Date(coupon.created_at))}</span><span className={`result-${coupon.status}`}>{statusLabel(coupon.status)}</span></div>
      <h2>{coupon.name}</h2><p className="muted">Kurs łączny: <strong>{Number(coupon.combined_odds).toFixed(2)}</strong> · Stawka: {coupon.stake !== null ? `${Number(coupon.stake).toFixed(2)} zł` : "—"}</p>
      <ol className="saved-items">{coupon.coupon_items.map((item) => <li key={item.id}><div><strong>{item.events.home_team} – {item.events.away_team}</strong><span className="muted small">{new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" }).format(new Date(item.events.kickoff))} · {statusLabel(item.events.status)}{item.events.home_score !== null && item.events.away_score !== null ? ` · ${item.events.home_score}:${item.events.away_score}` : ""}</span></div><span>Typ {item.selection} · {Number(item.odds_at_add).toFixed(2)}</span><span className={`result-${item.result}`}>{statusLabel(item.result)}</span></li>)}</ol>
      <div className="coupon-actions">{coupon.status === "draft" && <Link className="inline-link" href={`/?coupon=${coupon.id}`}>Edytuj kupon →</Link>}<DeleteCoupon id={coupon.id} /></div>
    </article>)}</div>
  </main>;
}
