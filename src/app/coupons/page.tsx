import { LiveResultsProvider } from "@components/live-results";
import { SavedCoupon } from "@components/saved-coupon";
import { eventColumns } from "@lib/events";
import { getI18n } from "@lib/i18n/server";
import Link from "next/link";
import { requireUser } from "@lib/supabase/server";
import { type Coupon } from "@lib/models";
import { AppHeader } from "@components/app-header";

export default async function CouponsPage() {
	const { db } = await requireUser();
	const { t } = await getI18n();
	const coupons: Coupon[] = [];
	for (let offset = 0; ; offset += 100) {
		const { data, error } = await db
			.from("coupons")
			.select(`*,coupon_items(*,events(${eventColumns}))`)
			.order("created_at", { ascending: false })
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
	return (
		<LiveResultsProvider
			eventIds={coupons.flatMap((coupon) => coupon.coupon_items.map((item) => item.event_id))}
			couponIds={coupons.map((coupon) => coupon.id)}
		>
			<main className="shell app-shell">
				<AppHeader />
				<section className="page-heading">
					<div>
						<h1>{t("coupons.title")}</h1>
					</div>
					<Link className="button-link" href="/">
						{t("coupons.new")}
					</Link>
				</section>
				{!coupons.length && <div className="empty">{t("coupons.empty")}</div>}
				<div className="coupon-list">
					{coupons.map((coupon) => {
						// This view needs names and scores, not the full team/H2H histories.
						const displayCoupon = {
							...coupon,
							coupon_items: coupon.coupon_items.map((item) => ({
								...item,
								events: { ...item.events, statistics: {} },
							})),
						};
						return (
							<SavedCoupon
								key={coupon.id}
								coupon={displayCoupon}
								canDelete={coupons.length > 1}
							/>
						);
					})}
				</div>
			</main>
		</LiveResultsProvider>
	);
}
