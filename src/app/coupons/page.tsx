import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { type Coupon } from "@/lib/models";
import { AppHeader } from "@/components/app-header";
import { DeleteCoupon } from "@/components/delete-coupon";

export default async function CouponsPage() {
	const { db } = await requireUser();
	const { t, statusLabel, formatDate, formatNumber, formatCurrency } = await getI18n();
	const coupons: Coupon[] = [];
	for (let offset = 0; ; offset += 100) {
		const { data, error } = await db
			.from("coupons")
			.select("*,coupon_items(*,events(*))")
			.order("created_at", { ascending: false })
			.order("id")
			.range(offset, offset + 99);
		if (error) {
			throw new Error("Nie udało się odczytać kuponów.");
		}
		coupons.push(...(data as Coupon[]));
		if (data.length < 100) {
			break;
		}
	}
	const results = await db
		.from("import_runs")
		.select("status,finished_at")
		.eq("kind", "results")
		.order("started_at", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (results.error) {
		throw new Error("Nie udało się odczytać historii wyników.");
	}
	return (
		<main className="shell app-shell">
			<AppHeader />
			<section className="page-heading">
				<div>
					<p className="eyebrow">{t("coupons.eyebrow")}</p>
					<h1>{t("coupons.title")}</h1>
					<p className="muted">{t("coupons.description")}</p>
				</div>
				<Link className="button-link" href="/">
					{t("coupons.new")}
				</Link>
			</section>
			{results.data?.status === "failed" && (
				<p role="alert" className="notice">
					{t("coupons.resultsFailed")}
				</p>
			)}
			{results.data?.status === "running" && (
				<p className="notice">{t("coupons.resultsRunning")}</p>
			)}
			{results.data?.status === "succeeded" && results.data.finished_at && (
				<p className="muted">
					{t("coupons.resultsUpdated", {
						date: formatDate(results.data.finished_at, {
							dateStyle: "short",
							timeStyle: "short",
						}),
					})}
				</p>
			)}
			{!coupons.length && <div className="empty">{t("coupons.empty")}</div>}
			<div className="coupon-list">
				{coupons.map((coupon) => (
					<article className="event-card" key={coupon.id}>
						<div className="event-meta">
							<span>{formatDate(coupon.created_at, { dateStyle: "medium" })}</span>
							<span className={`result-${coupon.status}`}>
								{statusLabel(coupon.status)}
							</span>
						</div>
						<h2>{coupon.name}</h2>
						<p className="muted">
							{t("coupon.combined")}:{" "}
							<strong>{formatNumber(Number(coupon.combined_odds))}</strong> ·{" "}
							{t("coupons.stake")}:{" "}
							{coupon.stake !== null ? formatCurrency(Number(coupon.stake)) : "—"}
						</p>
						<ol className="saved-items">
							{coupon.coupon_items.map((item) => (
								<li key={item.id}>
									<div>
										<strong>
											{item.events.home_team} – {item.events.away_team}
										</strong>
										<span className="muted small">
											{formatDate(item.events.kickoff, {
												dateStyle: "short",
												timeStyle: "short",
											})}{" "}
											· {statusLabel(item.events.status)}
											{item.events.home_score !== null &&
											item.events.away_score !== null
												? ` · ${item.events.home_score}:${item.events.away_score}`
												: ""}
										</span>
									</div>
									<span>
										{t("coupon.selection", {
											selection: item.selection,
											odds: formatNumber(Number(item.odds_at_add)),
										})}
									</span>
									<span className={`result-${item.result}`}>
										{statusLabel(item.result)}
									</span>
								</li>
							))}
						</ol>
						<div className="coupon-actions">
							{coupon.status === "draft" && (
								<Link className="inline-link" href={`/?coupon=${coupon.id}`}>
									{t("coupons.edit")}
								</Link>
							)}
							<DeleteCoupon id={coupon.id} />
						</div>
					</article>
				))}
			</div>
		</main>
	);
}
