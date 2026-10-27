import { eventStatus } from "./status.js";
import { MeczykiClient } from "./meczyki-client.js";
import { doubleChance, roundOdds } from "../odds.js";
import type { ApiMatch, ApiOdds, CollectedMatch, CollectionDocument, RecentMatch, TableEntry } from "./types.js";

function score(match: ApiMatch): string | null {
  return match.homeScore === null || match.awayScore === null
    ? null
    : `${match.homeScore}:${match.awayScore}`;
}

function recentMatch(match: ApiMatch): RecentMatch {
  return {
    match_id: match.id,
    date: match.startTime,
    competition: match.competition.displayName,
    home: match.homeParticipant.displayName,
    away: match.awayParticipant.displayName,
    score: score(match),
  };
}

function findStandingEntry(value: unknown, participantId: number): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStandingEntry(item, participantId);
      if (found) return found;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const participant = record.participant as Record<string, unknown> | undefined;
  if (
    participant?.id === participantId &&
    (typeof record.points === "number" || typeof record.displayOrder === "number")
  ) {
    return record;
  }

  for (const child of Object.values(record)) {
    const found = findStandingEntry(child, participantId);
    if (found) return found;
  }
  return null;
}

function tableEntry(
  rawStandings: unknown,
  participantId: number,
  competitionName: string,
): TableEntry {
  const entry = findStandingEntry(rawStandings, participantId);
  const participant = entry?.participant as Record<string, unknown> | undefined;
  const participantPosition = participant?.competitionPosition;
  return {
    competition: competitionName,
    position:
      typeof entry?.displayOrder === "number"
        ? entry.displayOrder
        : typeof participantPosition === "number"
          ? participantPosition
          : null,
    points: typeof entry?.points === "number" ? entry.points : null,
  };
}

export function selectOdds(records: ApiOdds[]): CollectedMatch["odds"] {
  const selected = records.find(
    (record) => [record.homeOdds, record.tieOdds, record.awayOdds].every((value) => Number.isFinite(value) && value > 1),
  );
  if (!selected) return { "1": null, X: null, "2": null, "1X": null, "2X": null };

  const one = roundOdds(selected.homeOdds);
  const draw = roundOdds(selected.tieOdds);
  const two = roundOdds(selected.awayOdds);
  return {
    "1": one,
    X: draw,
    "2": two,
    "1X": doubleChance(one, draw),
    "2X": doubleChance(two, draw),
  };
}

function h2hSummary(
  matches: ApiMatch[],
  scheduledHomeId: number,
): CollectedMatch["h2h"]["summary"] {
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let homeGoals = 0;
  let awayGoals = 0;

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const scheduledHomeWasHome = match.homeParticipant.id === scheduledHomeId;
    const scheduledHomeScore = scheduledHomeWasHome ? match.homeScore : match.awayScore;
    const scheduledAwayScore = scheduledHomeWasHome ? match.awayScore : match.homeScore;
    homeGoals += scheduledHomeScore;
    awayGoals += scheduledAwayScore;
    if (scheduledHomeScore > scheduledAwayScore) homeWins += 1;
    else if (scheduledHomeScore < scheduledAwayScore) awayWins += 1;
    else draws += 1;
  }

  return {
    matches: matches.length,
    home_wins: homeWins,
    draws,
    away_wins: awayWins,
    home_goals: homeGoals,
    away_goals: awayGoals,
  };
}

export async function collectMatches(date: string, client: MeczykiClient, maxMatches: number | null = null): Promise<CollectionDocument> {
  const standingsCache = new Map<string, Promise<unknown>>();
  const participantCache = new Map<number, Promise<ApiMatch[]>>();

  let matches = await client.getMatches(date);
  if (maxMatches !== null) matches = matches.slice(0, maxMatches);
  console.log(`Znaleziono ${matches.length} meczów na ${date}.`);

  const getParticipantMatches = (participantId: number) => {
    const existing = participantCache.get(participantId);
    if (existing) return existing;
    const request = client.getParticipantMatches(participantId, date);
    participantCache.set(participantId, request);
    return request;
  };

  const getStandings = (competitionId: number, season: number) => {
    const key = `${competitionId}:${season}`;
    const existing = standingsCache.get(key);
    if (existing) return existing;
    const request = client.getStandings(competitionId, season);
    standingsCache.set(key, request);
    return request;
  };

  const collected: CollectedMatch[] = [];

  for (const [index, match] of matches.entries()) {
    console.log(`[${index + 1}/${matches.length}] ${match.homeParticipant.displayName} – ${match.awayParticipant.displayName}`);
    const homeCompetition = match.homeParticipant.competition;
    const awayCompetition = match.awayParticipant.competition;

    const [odds, homeHistory, awayHistory, h2h, homeStandings, awayStandings] =
      await Promise.all([
        client.getOdds(match.id),
        getParticipantMatches(match.homeParticipant.id),
        getParticipantMatches(match.awayParticipant.id),
        client.getHeadToHead(match.homeParticipant.id, match.awayParticipant.id),
        homeCompetition
          ? getStandings(homeCompetition.id, match.normalizedSeason)
          : Promise.resolve(null),
        awayCompetition
          ? getStandings(awayCompetition.id, match.normalizedSeason)
          : Promise.resolve(null),
      ]);

    const finishedH2h = h2h.filter((item) => item.status === "finished");

    collected.push({
      status: eventStatus(match.status),
      match_id: match.id,
      kickoff: match.startTime,
      competition: match.competition.displayName,
      round: match.bracketRound?.displayName ?? null,
      home: {
        participant_id: match.homeParticipant.id,
        name: match.homeParticipant.displayName,
        table: homeCompetition
          ? tableEntry(homeStandings, match.homeParticipant.id, homeCompetition.displayName)
          : null,
        last_matches: homeHistory
          .filter((item) => item.status === "finished")
          .map(recentMatch),
      },
      away: {
        participant_id: match.awayParticipant.id,
        name: match.awayParticipant.displayName,
        table: awayCompetition
          ? tableEntry(awayStandings, match.awayParticipant.id, awayCompetition.displayName)
          : null,
        last_matches: awayHistory
          .filter((item) => item.status === "finished")
          .map(recentMatch),
      },
      h2h: {
        summary: h2hSummary(
          finishedH2h,
          match.homeParticipant.id,
        ),
        last_matches: finishedH2h.map(recentMatch),
      },
      odds: selectOdds(odds),
    });
  }

  const document: CollectionDocument = {
    date,
    timezone: "Europe/Warsaw",
    generated_at: new Date().toISOString(),
    matches: collected,
  };

  return document;
}
