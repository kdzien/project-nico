"use client";

import type { EventRow } from "@/lib/models";
import type { RecentMatch, CollectedTeam } from "@/lib/collector/types";
import { useI18n } from "@/lib/i18n/provider";

function History({ matches }: { matches: RecentMatch[] }) {
	const { t, formatDate } = useI18n();

	if (!matches.length) {
		return <p className="muted">{t("stats.noMatches")}</p>;
	}

	return (
		<ul className="history">
			{matches.map((match) => (
				<li key={match.match_id}>
					<span>
						{formatDate(match.date, { day: "2-digit", month: "2-digit" })}
						{" · "}
						{match.competition}
					</span>
					<div>
						{match.home} – {match.away}{" "}
						<strong>{match.score ?? t("stats.noScore")}</strong>
					</div>
				</li>
			))}
		</ul>
	);
}

function Team({ team, name }: { team: CollectedTeam | undefined; name: string }) {
	const { t } = useI18n();

	return (
		<section>
			<h4>{name}</h4>
			<p className="muted">
				{team?.table
					? t("stats.table", {
							competition: team.table.competition,
							position: team.table.position ?? "—",
							points: team.table.points ?? "—",
						})
					: t("stats.noTable")}
			</p>
			<History matches={team?.last_matches ?? []} />
		</section>
	);
}

export function EventStatistics({ event }: { event: EventRow }) {
	const { t } = useI18n();
	const stats = event.statistics;

	return (
		<details className="statistics">
			<summary>{t("stats.expand")}</summary>
			<div className="stats-grid">
				<Team team={stats.home} name={event.home_team} />
				<Team team={stats.away} name={event.away_team} />
				<section>
					<h4>{t("stats.h2h")}</h4>
					{stats.h2h && (
						<p className="muted">
							{t("stats.summary", {
								matches: stats.h2h.summary.matches,
								home: stats.h2h.summary.home_wins,
								draws: stats.h2h.summary.draws,
								away: stats.h2h.summary.away_wins,
							})}
							<br />
							{t("stats.goals", {
								home: stats.h2h.summary.home_goals,
								away: stats.h2h.summary.away_goals,
							})}
						</p>
					)}
					<History matches={stats.h2h?.last_matches ?? []} />
				</section>
			</div>
		</details>
	);
}
