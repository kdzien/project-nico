import type { EventRow } from "@/lib/models";
import type { RecentMatch, CollectedTeam } from "@/lib/collector/types";

function History({ matches }: { matches: RecentMatch[] }) {
  return matches.length ? <ul className="history">{matches.map((match) => <li key={match.match_id}>
    <span>{new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit" }).format(new Date(match.date))} · {match.competition}</span>
    <div>{match.home} – {match.away} <strong>{match.score ?? "Brak wyniku"}</strong></div>
  </li>)}</ul> : <p className="muted">Brak zakończonych spotkań.</p>;
}
function Team({ team, name }: { team: CollectedTeam | undefined; name: string }) {
  return <section><h4>{name}</h4><p className="muted">{team?.table ? `${team.table.competition} · Miejsce: ${team.table.position ?? "—"} · Punkty: ${team.table.points ?? "—"}` : "Tabela niedostępna dla tych rozgrywek."}</p>
    <History matches={team?.last_matches ?? []} /></section>;
}
export function EventStatistics({ event }: { event: EventRow }) {
  const stats = event.statistics;
  return <details className="statistics"><summary>Tabele, forma i H2H</summary>
    <div className="stats-grid"><Team team={stats.home} name={event.home_team} /><Team team={stats.away} name={event.away_team} />
      <section><h4>Bezpośrednie spotkania</h4>{stats.h2h && <p className="muted">{stats.h2h.summary.matches} meczów · {stats.h2h.summary.home_wins} zwycięstw gospodarza · {stats.h2h.summary.draws} remisów · {stats.h2h.summary.away_wins} zwycięstw gościa<br />Gole: {stats.h2h.summary.home_goals} : {stats.h2h.summary.away_goals}</p>}
        <History matches={stats.h2h?.last_matches ?? []} /></section>
    </div>
  </details>;
}
