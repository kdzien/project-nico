"use client";

import { MatchClock, MatchProgress } from "@components/live-results";
import { displayedScore } from "@lib/live-results";
import { memo } from "react";
import { selections, type EventRow, type Selection } from "@lib/models";
import { winningSelections } from "@lib/odds";
import { useI18n } from "@lib/i18n/provider";
import { MatchTeam } from "@components/match-team";

export const MatchCard = memo(function MatchCard({
	event,
	selection,
	asOf,
	onChoose,
}: {
	event: EventRow;
	selection: Selection | undefined;
	asOf: number;
	onChoose: (event: EventRow, selection: Selection) => void;
}) {
	const { t, formatNumber } = useI18n();
	const score = displayedScore(event);
	const winners =
		event.status === "finished" ? winningSelections(event.home_score, event.away_score) : [];
	const available = event.status === "scheduled" && Date.parse(event.kickoff) > asOf;

	return (
		<article
			className="event-card match-card"
			aria-label={`${event.home_team} – ${event.away_team}`}
		>
			<div className="match-overview">
				<MatchTeam
					name={event.home_team}
					team={event.statistics.home}
					side="home"
					teamId={event.home_team_id}
					logoHash={event.home_team_record?.logo_hash ?? null}
					showStandings={event.competition_type === "league"}
				/>
				<div className="match-center">
					<MatchClock event={event} />
					<div className="match-score" aria-label={t("match.score")}>
						{score ? (
							<>
								{score[0]}
								<span>:</span>
								{score[1]}
							</>
						) : (
							<span>—</span>
						)}
					</div>
					<MatchProgress event={event} showMinute={false} />
				</div>
				<MatchTeam
					name={event.away_team}
					team={event.statistics.away}
					side="away"
					teamId={event.away_team_id}
					logoHash={event.away_team_record?.logo_hash ?? null}
					showStandings={event.competition_type === "league"}
				/>
			</div>
			<div className="odds-grid">
				{selections.map((pick) => {
					const odds = event.odds[pick];
					const label = odds === null || odds === undefined ? "—" : formatNumber(odds);
					const won = winners.includes(pick);
					const quoteLabel = t("events.quoteLabel", {
						home: event.home_team,
						away: event.away_team,
						selection: pick,
						odds: label,
					});

					return (
						<button
							type="button"
							className={won ? "odd odd-won" : "odd"}
							key={pick}
							aria-label={won ? `${quoteLabel} · ${t("events.wonPick")}` : quoteLabel}
							aria-pressed={selection === pick}
							disabled={!available || !odds}
							onClick={() => onChoose(event, pick)}
						>
							<span>{pick}</span>
							<strong>{label}</strong>
						</button>
					);
				})}
			</div>
		</article>
	);
});
