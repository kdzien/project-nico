"use client";
import { useI18n } from "@/lib/i18n/provider";
import { useState } from "react";
import { selections, type Coupon, type DraftItem, type EventRow } from "@/lib/models";
import { CouponEditor } from "./coupon-editor";
import { EventStatistics } from "./event-statistics";

export function EventsBoard({
	events,
	coupon = null,
	asOf,
}: {
	events: EventRow[];
	coupon?: Coupon | null;
	asOf: number;
}) {
	const { t, locale, statusLabel, formatDate, formatNumber } = useI18n();
	const [items, setItems] = useState<DraftItem[]>(
		() =>
			coupon?.coupon_items.map((item) => ({
				event_id: item.event_id,
				selection: item.selection,
				odds_at_add: item.odds_at_add,
				event: item.events,
			})) ?? [],
	);
	const remove = (id: string) =>
		setItems((current) => current.filter((item) => item.event_id !== id));
	function choose(event: EventRow, selection: DraftItem["selection"]) {
		const quote = event.odds[selection];
		if (!quote || event.status !== "scheduled" || new Date(event.kickoff).getTime() <= asOf) {
			return;
		}
		setItems((current) => {
			if (
				current.some((item) => item.event_id === event.id && item.selection === selection)
			) {
				return current.filter((item) => item.event_id !== event.id);
			}
			return [
				...current.filter((item) => item.event_id !== event.id),
				{ event_id: event.id, selection, odds_at_add: quote, event },
			];
		});
	}
	const [league, setLeague] = useState("");
	const [team, setTeam] = useState("");
	const [status, setStatus] = useState("");
	const leagues = [...new Set(events.map((event) => event.competition))].sort();
	const statuses = [...new Set(events.map((event) => event.status))];
	const visible = events.filter(
		(event) =>
			(!league || event.competition === league) &&
			(!status || event.status === status) &&
			`${event.home_team} ${event.away_team}`
				.toLocaleLowerCase(locale)
				.includes(team.toLocaleLowerCase(locale)),
	);
	return (
		<div className="workspace">
			<section className="events-panel">
				<div className="filters">
					<label>
						{t("events.league")}
						<select value={league} onChange={(e) => setLeague(e.target.value)}>
							<option value="">{t("events.allLeagues")}</option>
							{leagues.map((name) => (
								<option key={name}>{name}</option>
							))}
						</select>
					</label>
					<label>
						{t("events.team")}
						<input
							value={team}
							onChange={(e) => setTeam(e.target.value)}
							placeholder={t("events.search")}
							type="search"
						/>
					</label>
					<label>
						{t("events.status")}
						<select value={status} onChange={(e) => setStatus(e.target.value)}>
							<option value="">{t("events.allStatuses")}</option>
							{statuses.map((value) => (
								<option key={value} value={value}>
									{statusLabel(value)}
								</option>
							))}
						</select>
					</label>
				</div>
				<p className="muted" aria-live="polite">
					{t("events.count", { visible: visible.length, total: events.length })}
				</p>
				<div className="event-list">
					{visible.map((event) => (
						<article className="event-card" key={event.id}>
							<div className="event-meta">
								<span>
									{event.competition}
									{event.round ? ` · ${event.round}` : ""}
								</span>
								<span>{statusLabel(event.status)}</span>
							</div>
							<div className="event-main">
								<time dateTime={event.kickoff}>
									{formatDate(event.kickoff, {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</time>
								<h3>
									{event.home_team}
									<span className="versus"> – </span>
									{event.away_team}
								</h3>
								{event.home_score !== null && event.away_score !== null && (
									<strong>
										{event.home_score} : {event.away_score}
									</strong>
								)}
							</div>
							<div className="odds-grid">
								{selections.map((selection) => (
									<button
										type="button"
										aria-label={t("events.quoteLabel", {
											home: event.home_team,
											away: event.away_team,
											selection,
											odds:
												event.odds[selection] !== null &&
												event.odds[selection] !== undefined
													? formatNumber(event.odds[selection])
													: t("common.unavailable"),
										})}
										aria-pressed={items.some(
											(item) =>
												item.event_id === event.id &&
												item.selection === selection,
										)}
										disabled={
											!event.odds[selection] ||
											event.status !== "scheduled" ||
											new Date(event.kickoff).getTime() <= asOf
										}
										onClick={() => choose(event, selection)}
										className="odd"
										key={selection}
									>
										<span>{selection}</span>
										<strong>
											{event.odds[selection] !== null &&
											event.odds[selection] !== undefined
												? formatNumber(event.odds[selection])
												: "—"}
										</strong>
									</button>
								))}
							</div>
							<EventStatistics event={event} />
						</article>
					))}
				</div>
				{!visible.length && (
					<div className="empty">
						{t(events.length ? "events.noMatches" : "events.empty")}
					</div>
				)}
			</section>
			<CouponEditor items={items} remove={remove} coupon={coupon} />
		</div>
	);
}
