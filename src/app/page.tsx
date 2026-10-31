import { getI18n } from "@lib/i18n/server";
import { z } from "zod";
import { AppHeader } from "@components/app-header";
import type { Coupon } from "@lib/models";
import { requireUser } from "@lib/supabase/server";
import { calendarDate, validDate } from "@lib/dates";
import { eventColumns, loadEvents } from "@lib/events";
import { EventsBoard } from "@components/events-board";

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ date?: string; coupon?: string }>;
}) {
	const { db } = await requireUser();
	const { t } = await getI18n();
	const query = await searchParams;
	const day =
		typeof query.date === "string" && validDate(query.date) ? query.date : calendarDate();
	const events = await loadEvents(db, day);
	const coupons: Coupon[] = [];
	for (let offset = 0; ; offset += 100) {
		const { data, error } = await db
			.from("coupons")
			.select(`*,coupon_items(*,events(${eventColumns}))`)
			.in("status", ["draft", "placed"])
			.is("settled_at", null)
			.order("created_at")
			.order("id")
			.range(offset, offset + 99)
			.overrideTypes<Coupon[], { merge: false }>();
		if (error) {
			throw new Error("Nie udało się odczytać kuponów.");
		}
		coupons.push(...data);
		if (data.length < 100) {
			break;
		}
	}
	const selectedCoupon =
		query.coupon && z.uuid().safeParse(query.coupon).success
			? coupons.find((coupon) => coupon.id === query.coupon)
			: null;
	// Server request time, passed once to the client to keep hydration deterministic.
	// eslint-disable-next-line react-hooks/purity
	const asOf = Date.now();
	return (
		<main className="shell app-shell">
			<AppHeader />

			{query.coupon && !selectedCoupon && (
				<p role="alert" className="notice">
					{t("events.invalidCoupon")}
				</p>
			)}
			<EventsBoard
				events={events}
				date={day}
				coupons={coupons}
				selectedCouponId={selectedCoupon?.id}
				asOf={asOf}
			/>
		</main>
	);
}
