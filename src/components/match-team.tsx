"use client";

import { memo } from "react";
import type { CollectedTeam } from "@lib/collector/types";
import { useI18n } from "@lib/i18n/provider";
import { TeamLogo } from "@components/team-logo";
import { TeamForm } from "@components/team-form";

export const MatchTeam = memo(function MatchTeam({
	name,
	team,
	side,
	teamId,
	logoHash,
	showStandings,
}: {
	name: string;
	teamId: string | null;
	logoHash: string | null;
	showStandings: boolean;
	team: CollectedTeam | undefined;
	side: "home" | "away";
}) {
	const { t } = useI18n();

	return (
		<section className={`match-team match-team-${side}`}>
			<div className="team-heading">

			{ side === "away" && <div className="team-standing-row">
				{showStandings &&
					team?.table &&
					(team.table.position !== null || team.table.points !== null) && (
						<span className="team-ranking">
							{team.table.position !== null && (
								<span
									className="team-standing-chip"
									title={t("match.position")}
									aria-label={t("match.positionValue", {
										position: team.table.position,
									})}
								>
									#{team.table.position}
								</span>
							)}
							{team.table.points !== null && (
								<span
									className="team-standing-chip"
									aria-label={t("match.pointsValue", {
										points: team.table.points,
									})}
								>
									{team.table.points} {t("match.pointsShort")}
								</span>
							)}
						</span>
					)}
			</div>}
				<h3>
					{side === "home" && <TeamLogo teamId={teamId} hash={logoHash} />}
					{name}
					{side === "away" && <TeamLogo teamId={teamId} hash={logoHash} />}
				</h3>
			{ side === "home" && <div className="team-standing-row">
				{showStandings &&
					team?.table &&
					(team.table.position !== null || team.table.points !== null) && (
						<span className="team-ranking">
							{team.table.position !== null && (
								<span
									className="team-standing-chip"
									title={t("match.position")}
									aria-label={t("match.positionValue", {
										position: team.table.position,
									})}
								>
									#{team.table.position}
								</span>
							)}
							{team.table.points !== null && (
								<span
									className="team-standing-chip"
									aria-label={t("match.pointsValue", {
										points: team.table.points,
									})}
								>
									{team.table.points} {t("match.pointsShort")}
								</span>
							)}
						</span>
					)}
			</div>}
			</div>
			<TeamForm teamName={team?.name ?? name} matches={team?.last_matches ?? []} side={side} />
		</section>
	);
});
