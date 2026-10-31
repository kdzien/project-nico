"use client";

import Link from "next/link";
import { DeleteCoupon } from "@components/delete-coupon";
import { MatchClock, useResultsSnapshot } from "@components/live-results";
import { ResultIcon, EditIcon } from "@components/result-icon";
import { TeamLogo } from "@components/team-logo";
import { potentialWinnings } from "@lib/coupons";
import { useI18n } from "@lib/i18n/provider";
import { displayedScore, mergeEventResult } from "@lib/live-results";
import type { Coupon } from "@lib/models";
import { couponResult, selectionResult } from "@lib/result-status";

export function SavedCoupon({ coupon, canDelete }: { coupon: Coupon; canDelete: boolean }) {
	const { t, formatDate, formatNumber, formatCurrency } = useI18n();
	const snapshot = useResultsSnapshot();
	const current = snapshot.coupons.find((value) => value.id === coupon.id) ?? coupon;
	const updates = new Map(snapshot.events.map((event) => [event.id, event]));
	const items = coupon.coupon_items
		.map((item) => ({
			...item,
			result:
				current.coupon_items.find((value) => value.id === item.id)?.result ?? item.result,
			events: mergeEventResult(item.events, updates.get(item.event_id)),
		}))
		.sort(
			(a, b) =>
				Date.parse(a.events.kickoff) - Date.parse(b.events.kickoff) ||
				a.id.localeCompare(b.id),
		);
	const states = items.map((item) => selectionResult(item.result, item.selection, item.events));
	const editable = !current.settled_at && ["draft", "placed"].includes(current.status);
	const potential = coupon.stake === null ? null : potentialWinnings(items, Number(coupon.stake));
	return (
		<article className="event-card saved-coupon" aria-label={t("coupon.title")}>
			<header className="saved-coupon-header">
				<time dateTime={coupon.created_at}>
					{formatDate(coupon.created_at, { dateStyle: "medium" })}
				</time>
				<div className="saved-coupon-actions">
					{editable && (
						<Link
							className="coupon-icon-button"
							href={`/?coupon=${coupon.id}`}
							aria-label={t("coupon.editAction")}
							title={t("coupon.editAction")}
						>
							<EditIcon />
						</Link>
					)}
					{canDelete && <DeleteCoupon id={coupon.id} />}
					<ResultIcon state={couponResult(current, states)} />
				</div>
			</header>
			<dl className="saved-coupon-metrics">
				<div>
					<dt>{t("coupon.combined")}</dt>
					<dd>{formatNumber(Number(current.combined_odds))}</dd>
				</div>
				<div>
					<dt>{t("coupons.stake")}</dt>
					<dd>{coupon.stake === null ? "—" : formatCurrency(Number(coupon.stake))}</dd>
				</div>
				<div>
					<dt>{t("coupon.potentialWin")}</dt>
					<dd>{potential === null ? "—" : formatCurrency(potential)}</dd>
				</div>
			</dl>
			<ol className="saved-coupon-items">
				{items.map((item, index) => {
					const event = item.events;
					const score = displayedScore(event);
					return (
						<li className="saved-coupon-item" key={item.id}>
							<div className="saved-coupon-item-content">
								<div className="coupon-fixture">
									<div className="coupon-item-meta">
										<time
											className="coupon-kickoff-chip"
											dateTime={event.kickoff}
										>
											{formatDate(event.kickoff, {
												day: "2-digit",
												month: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</time>
										<span className="coupon-selection-chip">
											{t("coupon.selection", {
												selection: item.selection,
												odds: formatNumber(Number(item.odds_at_add)),
											})}
										</span>
									</div>
									<div className="coupon-fixture-team">
										<TeamLogo
											teamId={event.home_team_id}
											hash={event.home_team_record?.logo_hash ?? null}
										/>
										<span>{event.home_team}</span>
									</div>
									<div className="coupon-fixture-result">
										<strong
											className={`coupon-fixture-score${event.status === "live" ? " coupon-fixture-score-live" : ""}`}
											aria-label={t("match.score")}
											data-result={states[index]}
										>
											{score ? `${score[0]}:${score[1]}` : "–"}
										</strong>
										{event.status === "live" && (
											<span className="coupon-live-minute-chip">
												<MatchClock event={event} />
											</span>
										)}
									</div>
									<div className="coupon-fixture-team coupon-fixture-away">
										<span>{event.away_team}</span>
										<TeamLogo
											teamId={event.away_team_id}
											hash={event.away_team_record?.logo_hash ?? null}
										/>
									</div>
								</div>
							</div>
							<ResultIcon state={states[index]!} />
						</li>
					);
				})}
			</ol>
		</article>
	);
}
