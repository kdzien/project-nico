import { z } from "zod";
import { requireUser } from "@lib/supabase/server";
import { resultColumns, type CouponResult, type EventResult } from "@lib/live-results";

const input = z.object({
	eventIds: z.array(z.uuid()).max(250),
	couponIds: z.array(z.uuid()).max(250),
});
export async function POST(request: Request) {
	const { db } = await requireUser();
	const parsed = input.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return Response.json({}, { status: 400 });
	}
	const { eventIds, couponIds } = parsed.data;
	const [events, coupons] = await Promise.all([
		eventIds.length
			? db
					.from("events")
					.select(resultColumns)
					.in("id", eventIds)
					.overrideTypes<EventResult[], { merge: false }>()
			: { data: [], error: null },
		couponIds.length
			? db
					.from("coupons")
					.select(
						"id,status,settled_at,combined_odds,coupon_items(id,event_id,selection,result)",
					)
					.in("id", couponIds)
					.overrideTypes<CouponResult[], { merge: false }>()
			: { data: [], error: null },
	]);
	if (events.error || coupons.error) {
		return Response.json({}, { status: 503, headers: { "Cache-Control": "no-store" } });
	}
	return Response.json(
		{ events: events.data, coupons: coupons.data },
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
