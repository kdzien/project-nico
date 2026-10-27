"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { saveCoupon } from "@/app/coupons/actions";
import { combinedOdds } from "@/lib/coupons";
import type { Coupon, DraftItem } from "@/lib/models";

export function CouponEditor({ items, remove, coupon }: { items: DraftItem[]; remove: (id: string) => void; coupon: Coupon | null }) {
  const [state, action, pending] = useActionState(saveCoupon, { message: "", id: coupon?.id ?? null, ok: false });
  const [name, setName] = useState(coupon?.name ?? "Mój kupon");
  const [stake, setStake] = useState(coupon?.stake?.toString() ?? "");
  const combined = combinedOdds(items);
  return <aside className="coupon-editor"><p className="eyebrow">TWÓJ KUPON</p><h2>{coupon ? "Edytuj wersję roboczą" : "Dobry typ zaczyna się tutaj."}</h2>
    <p className="muted">{items.length} pozycji · Jeden wybór na mecz</p>
    {!items.length && <p className="muted">Wybierz kurs przy wydarzeniu, aby dodać typ.</p>}
    <ol className="draft-items">{items.map((item) => <li key={item.event_id}><strong>{item.event.home_team} – {item.event.away_team}</strong>
      <div className="draft-line"><span>Typ {item.selection} · {item.odds_at_add.toFixed(2)}</span><button type="button" className="text-button" aria-label={`Usuń ${item.event.home_team} – ${item.event.away_team}`} onClick={() => remove(item.event_id)} disabled={pending}>Usuń</button></div></li>)}</ol>
    <div className="combined"><span>Kurs łączny</span><strong>{combined.toFixed(2)}</strong></div>
    <form action={action} className="stack">
      <input type="hidden" name="items" value={JSON.stringify(items.map(({ event_id, selection, odds_at_add }) => ({ event_id, selection, odds_at_add })))} />
      <input type="hidden" name="id" value={state.id ?? ""} />
      <label>Nazwa kuponu<input name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Stawka (opcjonalnie)<input type="number" name="stake" min="0" max="9999999999.99" step="0.01" value={stake} onChange={(e) => setStake(e.target.value)} /></label>
      {state.message && <p role="status" className={state.ok ? "success" : "notice"}>{state.message}</p>}
      <button name="intent" value="draft" disabled={pending || !items.length || !Number.isFinite(combined) || combined >= 1e10}>{pending ? "Zapisywanie…" : "Zapisz wersję roboczą"}</button>
      <button name="intent" value="finalize" className="secondary" disabled={pending || !items.length || !Number.isFinite(combined) || combined >= 1e10}>Zamknij i śledź wyniki</button>
    </form>
    <p className="muted small">Zamknięty kupon nie podlega edycji. Nico zapisuje Twoje typy do obserwacji; nie wykonuje zakładów.</p>
    <Link className="inline-link" href="/coupons">Zobacz moje kupony →</Link>
  </aside>;
}
