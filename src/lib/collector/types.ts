export interface ApiResponse<T> {
  data: T;
}

export interface NamedEntity {
  id: number;
  displayName: string;
}

export interface Competition extends NamedEntity {
  hasStandings?: boolean;
}

export interface Participant extends NamedEntity {
  competition?: Competition | null;
  competitionPosition?: number | null;
}

export interface ApiMatch {
  id: number;
  startTime: string;
  normalizedSeason: number;
  status: string;
  withOvertime?: boolean;
  attributes?: { type: string; value: string | number | null }[];
  competition: Competition;
  bracketRound?: { displayName: string } | null;
  homeParticipant: Participant;
  awayParticipant: Participant;
  homeScore: number | null;
  awayScore: number | null;
}

export interface ApiOdds {
  matchItem: { id: number };
  homeOdds: number;
  tieOdds: number;
  awayOdds: number;
  bookie: { name: string };
}

export interface RecentMatch {
  match_id: number;
  date: string;
  competition: string;
  home: string;
  away: string;
  score: string | null;
}

export interface TableEntry {
  competition: string;
  position: number | null;
  points: number | null;
}

export interface CollectedTeam {
  participant_id: number;
  name: string;
  table: TableEntry | null;
  last_matches: RecentMatch[];
}

export interface CollectedMatch {
  status: string;
  match_id: number;
  kickoff: string;
  competition: string;
  round: string | null;
  home: CollectedTeam;
  away: CollectedTeam;
  h2h: {
    summary: {
      matches: number;
      home_wins: number;
      draws: number;
      away_wins: number;
      home_goals: number;
      away_goals: number;
    };
    last_matches: RecentMatch[];
  };
  odds: {
    "1": number | null;
    X: number | null;
    "2": number | null;
    "1X": number | null;
    "2X": number | null;
  };
}

export interface CollectionDocument {
  date: string;
  timezone: string;
  generated_at: string;
  matches: CollectedMatch[];
}
