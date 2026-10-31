"use client";

import { useId, useMemo, useState } from "react";
import { useI18n } from "@lib/i18n/provider";
import { oddsBuckets, type BalancePoint, type CouponStatistics } from "@lib/statistics";

function BalanceChart({ points }: { points: BalancePoint[] }) {
	const { t, locale, formatDate, formatCurrency } = useI18n();
	const gradientId = useId();
	const [focused, setFocused] = useState<number | null>(null);
	const compact = useMemo(
		() =>
			new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
				notation: "compact",
				maximumFractionDigits: 1,
			}),
		[locale],
	);
	if (!points.length) {
		return <div className="statistics-chart-empty">{t("statistics.noSettledCoupons")}</div>;
	}
	const series = [{ date: "", balance: 0 }, ...points];
	const firstTime = Date.parse(points[0]!.date) - 86400000;
	const lastTime = Date.parse(points[points.length - 1]!.date);
	const values = series.map((point) => point.balance);
	const low = Math.min(0, ...values);
	const high = Math.max(0, ...values);
	const margin = Math.max((high - low) * 0.12, 1);
	const min = low - margin;
	const max = high + margin;
	const x = (index: number) =>
		62 +
		(((index === 0 ? firstTime : Date.parse(series[index]!.date)) - firstTime) /
			(lastTime - firstTime)) *
			628;
	const y = (value: number) => 220 - ((value - min) / (max - min)) * 190;
	const line = series
		.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.balance)}`)
		.join(" ");
	const area = `${line} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
	const selectedIndex = focused !== null && series[focused] ? focused : series.length - 1;
	const selected = series[selectedIndex]!;
	const pointLabel = (index: number) =>
		index === 0
			? t("statistics.start")
			: formatDate(series[index]!.date, { dateStyle: "medium" });

	return (
		<>
			<div className="balance-chart-detail" aria-live="polite">
				<span>{pointLabel(selectedIndex)}</span>
				<strong
					className={
						selected.balance < 0
							? "result-lost"
							: selected.balance > 0
								? "statistics-positive"
								: ""
					}
				>
					{selected.balance > 0 ? "+" : ""}
					{formatCurrency(selected.balance)}
				</strong>
			</div>
			<div className="balance-chart-scroll">
				<svg
					className="balance-chart"
					viewBox="0 0 720 260"
					role="group"
					aria-label={t("statistics.balanceHistory")}
					onPointerLeave={() => setFocused(null)}
				>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.18" />
							<stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0.02" />
						</linearGradient>
					</defs>
					{[0, 1, 2, 3].map((tick) => {
						const value = min + ((max - min) * tick) / 3;
						return (
							<g key={tick} aria-hidden="true">
								<line
									x1="62"
									x2="690"
									y1={y(value)}
									y2={y(value)}
									className="chart-grid"
								/>
								<text x="50" y={y(value) + 4} textAnchor="end">
									{compact.format(value)}
								</text>
							</g>
						);
					})}
					<line x1="62" x2="690" y1={y(0)} y2={y(0)} className="chart-zero" />
					<path d={area} fill={`url(#${gradientId})`} />
					<path d={line} className="chart-balance-line" />
					<line
						x1={x(selectedIndex)}
						x2={x(selectedIndex)}
						y1="30"
						y2="220"
						className="chart-guide"
					/>
					{series.map((point, index) => (
						<g
							key={point.date}
							tabIndex={0}
							role="img"
							aria-label={`${pointLabel(index)}: ${formatCurrency(point.balance)}`}
							onFocus={() => setFocused(index)}
							onBlur={() => setFocused(null)}
							onPointerEnter={() => setFocused(index)}
						>
							<circle cx={x(index)} cy={y(point.balance)} r="13" fill="transparent" />
							<circle
								cx={x(index)}
								cy={y(point.balance)}
								r={index === selectedIndex ? 5 : 3}
								className="chart-point"
							/>
						</g>
					))}
					<text x="62" y="250" aria-hidden="true">
						{t("statistics.start")}
					</text>
					<text x="690" y="250" textAnchor="end" aria-hidden="true">
						{formatDate(points[points.length - 1]!.date, { dateStyle: "short" })}
					</text>
				</svg>
			</div>
		</>
	);
}

export function StatisticsCharts({ statistics }: { statistics: CouponStatistics }) {
	const { t, formatNumber } = useI18n();
	const [view, setView] = useState<"selection" | "odds" | "competition">("selection");
	const rows =
		view === "selection"
			? statistics.bySelection
			: view === "odds"
				? statistics.byOdds
				: statistics.byCompetition.slice(0, 10);
	const settled = rows.reduce((sum, group) => sum + group.won + group.lost, 0);
	function label(key: string, fallback: string) {
		if (view !== "odds") {
			return fallback;
		}
		const bucket = oddsBuckets.find((range) => range.key === key)!;
		if (bucket.min === null) {
			return t("statistics.oddsBelow", { value: formatNumber(bucket.max!) });
		}
		if (bucket.max === null) {
			return t("statistics.oddsFrom", { value: formatNumber(bucket.min) });
		}
		return t("statistics.oddsRange", {
			from: formatNumber(bucket.min),
			to: formatNumber(bucket.max),
		});
	}
	return (
		<div className="statistics-charts">
			<section className="statistics-chart-panel">
				<h3>{t("statistics.balanceHistory")}</h3>
				<BalanceChart points={statistics.timeline} />
			</section>
			<section className="statistics-chart-panel">
				<h3>{t("statistics.hitRate")}</h3>
				<div
					className="statistics-chart-tabs"
					role="group"
					aria-label={t("statistics.groupBy")}
				>
					{(["selection", "odds", "competition"] as const).map((option) => (
						<button
							type="button"
							key={option}
							aria-pressed={view === option}
							onClick={() => setView(option)}
						>
							{t(
								option === "selection"
									? "statistics.bySelection"
									: option === "odds"
										? "statistics.byOdds"
										: "statistics.byCompetition",
							)}
						</button>
					))}
				</div>
				{!settled ? (
					<div className="statistics-chart-empty">{t("statistics.noSettledItems")}</div>
				) : (
					<div className="performance-chart">
						{rows.map((group) => {
							const count = group.won + group.lost;
							const rate = count ? (group.won / count) * 100 : 0;
							return (
								<div className="performance-row" key={group.key}>
									<span className="performance-label">
										{label(group.key, group.label)}
									</span>
									<div
										className="performance-track"
										role="img"
										aria-label={t("statistics.outcomeDetails", {
											won: group.won,
											lost: group.lost,
											void: group.void,
											pending: group.pending,
										})}
										title={t("statistics.outcomeDetails", {
											won: group.won,
											lost: group.lost,
											void: group.void,
											pending: group.pending,
										})}
									>
										{count > 0 && (
											<>
												<span
													className="performance-won"
													style={{ width: `${rate}%` }}
												/>
												<span
													className="performance-lost"
													style={{ width: `${100 - rate}%` }}
												/>
											</>
										)}
									</div>
									<span className="performance-value">
										{count ? `${formatNumber(rate)}%` : "—"}
										<small>
											{group.won} / {count}
										</small>
									</span>
								</div>
							);
						})}
					</div>
				)}
				<div className="performance-legend">
					<span>
						<i className="performance-won" />
						{t("status.won")}
					</span>
					<span>
						<i className="performance-lost" />
						{t("status.lost")}
					</span>
				</div>
				<p className="statistics-note">{t("statistics.hitRateNote")}</p>
				{view === "competition" && (
					<p className="statistics-note">{t("statistics.competitionNote")}</p>
				)}
			</section>
		</div>
	);
}
