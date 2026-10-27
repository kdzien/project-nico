import { getI18n } from "@/lib/i18n/server";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import type { Coupon } from "@/lib/models";
import { requireUser } from "@/lib/supabase/server";
import { calendarDate, validDate } from "@/lib/dates";
import { loadEvents } from "@/lib/events";
import { EventsBoard } from "@/components/events-board";

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ date?: string; coupon?: string }>;
}) {
	const { db } = await requireUser();
	const { t, formatDate } = await getI18n();
	const query = await searchParams;
	const day =
		typeof query.date === "string" && validDate(query.date) ? query.date : calendarDate();
	const [events, run] = await Promise.all([
		loadEvents(db, day),
		db
			.from("import_runs")
			.select("status,events_saved,finished_at")
			.eq("target_date", day)
			.eq("kind", "events")
			.order("started_at", { ascending: false })
			.limit(1)
			.maybeSingle(),
	]);
	if (run.error) {
		throw new Error("Nie udało się odczytać historii importu.");
	}
	let coupon: Coupon | null = null;
	if (query.coupon && z.uuid().safeParse(query.coupon).success) {
		const saved = await db
			.from("coupons")
			.select("*,coupon_items(*,events(*))")
			.eq("id", query.coupon)
			.eq("status", "draft")
			.maybeSingle();
		if (saved.error) {
			throw new Error("Nie udało się odczytać kuponu.");
		}
		coupon = saved.data as Coupon | null;
	}
	// Server request time, passed once to the client to keep hydration deterministic.
	// eslint-disable-next-line react-hooks/purity
	const asOf = Date.now();
	return (
		<main className="shell app-shell">
			<AppHeader />
			<section className="page-heading">
				<div>
					<p className="eyebrow">{t("events.eyebrow")}</p>
					<h1>{t("events.title")}</h1>
					<p className="muted">{t("events.description")}</p>
				</div>
				<form className="date-form">
					{coupon && <input type="hidden" name="coupon" value={coupon.id} />}
					<label>
						{t("events.day")}
						<input type="date" name="date" defaultValue={day} required />
					</label>
					<button>{t("events.show")}</button>
				</form>
			</section>
			{run.data?.status === "failed" && (
				<p role="alert" className="notice">
					{t("events.importFailed")}
				</p>
			)}
			{run.data?.status === "running" && (
				<p className="notice">{t("events.importRunning")}</p>
			)}
			{!run.data && <p className="notice">{t("events.noImport")}</p>}
			{run.data?.status === "succeeded" && (
				<p className="muted">
					{t("events.lastImport", {
						count: run.data.events_saved,
						date: run.data.finished_at
							? formatDate(run.data.finished_at, {
									dateStyle: "short",
									timeStyle: "short",
								})
							: "—",
					})}
				</p>
			)}
			{query.coupon && !coupon && (
				<p role="alert" className="notice">
					{t("events.invalidCoupon")}
				</p>
			)}
			<EventsBoard key={coupon?.id ?? "new"} events={events} coupon={coupon} asOf={asOf} />
		</main>
	);
}
