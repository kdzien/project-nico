import { AppHeader } from "@components/app-header";
import { StatisticsCharts } from "@components/statistics-charts";
import { getI18n } from "@lib/i18n/server";
import { couponStatistics, loadStatisticsCoupons } from "@lib/statistics";
import { requireUser } from "@lib/supabase/server";

export default async function StatisticsPage() {
	const { db } = await requireUser();
	const { t, formatCurrency } = await getI18n();
	const statistics = couponStatistics(await loadStatisticsCoupons(db));
	return (
		<main className="shell app-shell">
			<AppHeader />
			<header className="page-heading">
				<h1>{t("statistics.title")}</h1>
			</header>
			<section className="statistics-finances" aria-labelledby="finances-heading">
				<h2 id="finances-heading">{t("statistics.myFinances")}</h2>
				<dl className="statistics-metrics">
					<div>
						<dt>{t("statistics.totalStake")}</dt>
						<dd>{formatCurrency(statistics.stake)}</dd>
					</div>
					<div>
						<dt>{t("statistics.winnings")}</dt>
						<dd>{formatCurrency(statistics.winnings)}</dd>
					</div>
					<div
						className="statistics-balance"
						data-state={
							statistics.balance > 0
								? "positive"
								: statistics.balance < 0
									? "negative"
									: "neutral"
						}
					>
						<dt>{t("statistics.balance")}</dt>
						<dd>
							{statistics.balance > 0 ? "+" : ""}
							{formatCurrency(statistics.balance)}
						</dd>
					</div>
				</dl>
				<dl className="statistics-facts">
					<div>
						<dt>{t("statistics.pendingStake")}</dt>
						<dd>{formatCurrency(statistics.pendingStake)}</dd>
					</div>
					<div>
						<dt>{t("statistics.refunds")}</dt>
						<dd>{formatCurrency(statistics.refunds)}</dd>
					</div>
					<div>
						<dt>{t("statistics.couponRecord")}</dt>
						<dd>
							<span className="statistics-positive">{statistics.outcomes.won}</span> /{" "}
							<span className="result-lost">{statistics.outcomes.lost}</span>
						</dd>
					</div>
				</dl>
				<p className="statistics-note">{t("statistics.moneyNote")}</p>
				{statistics.missingStake > 0 && (
					<p className="statistics-note">
						{t("statistics.missingStake", { count: statistics.missingStake })}
					</p>
				)}
			</section>
			<section className="statistics-analysis" aria-labelledby="analysis-heading">
				<h2 id="analysis-heading">{t("statistics.history")}</h2>
				<StatisticsCharts statistics={statistics} />
			</section>
		</main>
	);
}
