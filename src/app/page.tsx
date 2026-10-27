import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import type { Coupon } from "@/lib/models";
import { requireUser } from "@/lib/supabase/server";
import { calendarDate, validDate } from "@/lib/dates";
import { loadEvents } from "@/lib/events";
import { EventsBoard } from "@/components/events-board";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ date?: string; coupon?: string }> }) {
  const { db } = await requireUser();
  const query = await searchParams;
  const day = typeof query.date === "string" && validDate(query.date) ? query.date : calendarDate();
  const [events, run] = await Promise.all([
    loadEvents(db, day),
    db.from("import_runs").select("status,events_saved,finished_at").eq("target_date", day).eq("kind", "events").order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (run.error) throw new Error("Nie udało się odczytać historii importu.");
  let coupon: Coupon | null = null;
  if (query.coupon && z.uuid().safeParse(query.coupon).success) {
    const saved = await db.from("coupons").select("*,coupon_items(*,events(*))").eq("id", query.coupon).eq("status", "draft").maybeSingle();
    if (saved.error) throw new Error("Nie udało się odczytać kuponu.");
    coupon = saved.data as Coupon | null;
  }
  // Server request time, passed once to the client to keep hydration deterministic.
  // eslint-disable-next-line react-hooks/purity
  const asOf = Date.now();
  return <main className="shell app-shell">
    <AppHeader />
    <section className="page-heading"><div><p className="eyebrow">WYDARZENIA</p><h1>Boisko możliwości.</h1><p className="muted">Przeglądaj mecze, sprawdzaj formę i układaj własne kupony.</p></div>
      <form className="date-form">{coupon && <input type="hidden" name="coupon" value={coupon.id} />}<label>Dzień · Europe/Warsaw<input type="date" name="date" defaultValue={day} required /></label><button>Pokaż</button></form></section>
    {run.data?.status === "failed" && <p role="alert" className="notice">Ostatni import nie powiódł się. Widoczne dane mogą być nieaktualne.</p>}
    {run.data?.status === "running" && <p className="notice">Trwa import wydarzeń. Odśwież stronę za chwilę.</p>}
    {!run.data && <p className="notice">Brak zakończonego importu dla tego dnia.</p>}
    {run.data?.status === "succeeded" && <p className="muted">Ostatni import: {run.data.events_saved} wydarzeń · {run.data.finished_at ? new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" }).format(new Date(run.data.finished_at)) : "—"}</p>}
    {query.coupon && !coupon && <p role="alert" className="notice">Nie znaleziono własnego kuponu roboczego do edycji.</p>}
    <EventsBoard key={coupon?.id ?? "new"} events={events} coupon={coupon} asOf={asOf} />
  </main>;
}
