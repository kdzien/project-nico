"use client";

import { memo } from "react";
import type { CollectedTeam } from "@lib/collector/types";
import { useI18n } from "@lib/i18n/provider";
import { TeamForm } from "@components/team-form";

export const MatchTeam = memo(function MatchTeam({
	name,
	team,
	side,
}: {
	name: string;
	team: CollectedTeam | undefined;
	side: "home" | "away";
}) {
	const { t } = useI18n();

	return (
		<section className={`match-team match-team-${side}`}>
			<div className="team-heading">
				<h3>{name}</h3>
				{team?.table && (
					<span className="team-ranking">
						<span
							title={t("match.position")}
							aria-label={t("match.positionValue", {
								position: team.table.position ?? "—",
							})}
						>
							#{team.table.position ?? "—"}
						</span>
						<span className="team-ranking-divider" aria-hidden="true">
							·
						</span>
						<span
							aria-label={t("match.pointsValue", {
								points: team.table.points ?? "—",
							})}
						>
							{team.table.points ?? "—"} {t("match.pointsShort")}
						</span>
					</span>
				)}
			</div>
			<TeamForm teamName={team?.name ?? name} matches={team?.last_matches ?? []} />
		</section>
	);
});
