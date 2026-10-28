"use client";

import type { EventRow } from "@lib/models";
import { useI18n } from "@lib/i18n/provider";

export function HeadToHead({ event }: { event: EventRow }) {
	const { t, formatDate } = useI18n();
	const h2h = event.statistics.h2h;
	const history = [...(h2h?.last_matches ?? [])].sort(
		(a, b) => Date.parse(b.date) - Date.parse(a.date),
	);

	if (!h2h || !history.length) {
		return (
			<div className="h2h-empty">
				<span>{t("h2h.title")}</span>
				<span>—</span>
			</div>
		);
	}

	return (
		<details className="h2h">
			<summary
				aria-label={t("h2h.summary", {
					home: event.home_team,
					homeWins: h2h.summary.home_wins,
					draws: h2h.summary.draws,
					away: event.away_team,
					awayWins: h2h.summary.away_wins,
				})}
			>
				<span className="h2h-title">{t("h2h.title")}</span>
				<span className="h2h-results">
					<span className="h2h-result" title={event.home_team}>
						<strong>{h2h.summary.home_wins}</strong>
						<span>{t("match.home")}</span>
					</span>
					<span className="h2h-result h2h-result-draw" title={t("h2h.draws")}>
						<strong>{h2h.summary.draws}</strong>
						<span>{t("h2h.draws")}</span>
					</span>
					<span className="h2h-result" title={event.away_team}>
						<strong>{h2h.summary.away_wins}</strong>
						<span>{t("match.away")}</span>
					</span>
				</span>
				<span className="h2h-count">{t("h2h.count", { count: h2h.summary.matches })}</span>
				<span className="h2h-toggle" aria-hidden="true" />
			</summary>
			<ul className="h2h-history">
				{history.map((match) => (
					<li key={match.match_id}>
						<time dateTime={match.date}>
							{formatDate(match.date, {
								day: "2-digit",
								month: "2-digit",
								year: "2-digit",
							})}
						</time>
						<span className="h2h-history-home">{match.home}</span>
						<strong>{match.score ?? "—"}</strong>
						<span>{match.away}</span>
					</li>
				))}
			</ul>
		</details>
	);
}
