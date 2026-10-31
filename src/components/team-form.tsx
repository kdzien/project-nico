"use client";

import { useId } from "react";
import type { RecentMatch } from "@lib/collector/types";
import { useI18n } from "@lib/i18n/provider";

function matchOutcome(match: RecentMatch, teamName: string): "W" | "D" | "L" | null {
	const score = match.score?.match(/^(\d+)\s*:\s*(\d+)$/);
	if (!score) {
		return null;
	}

	const team = teamName.trim().toLocaleLowerCase();
	const isHome = match.home.trim().toLocaleLowerCase() === team;
	const isAway = match.away.trim().toLocaleLowerCase() === team;
	if (!isHome && !isAway) {
		return null;
	}

	const home = Number(score[1]);
	const away = Number(score[2]);
	const ownScore = isHome ? home : away;
	const opponentScore = isHome ? away : home;

	if (ownScore === opponentScore) {
		return "D";
	}
	return ownScore > opponentScore ? "W" : "L";
}

export function TeamForm({ matches, teamName, side }: { matches: RecentMatch[]; teamName: string; side: "home" | "away" }) {
	const { t, formatDate } = useI18n();
	const id = useId();
	let history = [...matches].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
	if (side === "home") {
		history = history.reverse();
	}

	if (!history.length) {
		return (
			<span className="team-form-empty" aria-label={t("form.empty")}>
				—
			</span>
		);
	}

	return (
		<div className="team-form" role="group" aria-label={t("form.label", { team: teamName })}>
			{history.map((match) => {
				const outcome = matchOutcome(match, teamName);
				const tooltipId = `${id}-${match.match_id}`;

				return (
					<span className="form-entry" key={match.match_id}>
						<button
							type="button"
							className={`form-tile form-${outcome ?? "unknown"}`}
							aria-describedby={tooltipId}
						>
							{outcome ?? "—"}
						</button>
						<span className="form-tooltip" role="tooltip" id={tooltipId}>
							<span className="form-tooltip-date">
								{formatDate(match.date, { dateStyle: "short" })}
								{" · "}
								{match.competition}
							</span>
							<strong>
								{match.home} {match.score ?? "—"} {match.away}
							</strong>
						</span>
					</span>
				);
			})}
		</div>
	);
}
