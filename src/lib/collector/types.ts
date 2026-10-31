export interface ApiResponse<T> {
	data: T;
}

export type ApiMatchesData =
	| ApiMatch[]
	| {
			matches: ApiMatch[];
			hasLiveMatches?: boolean;
	  };

export interface NamedEntity {
	id: number;
	displayName: string;
}

export interface Competition extends NamedEntity {
	hasStandings?: boolean;
	slug?: string | null;
	type?: string | null;
	countryGameLevel?: number | null;
	displayOrder?: number | null;
	country?: (NamedEntity & { slug?: string | null }) | null;
}

export interface Participant extends NamedEntity {
	slug?: string | null;
	country?: NamedEntity | null;
	hasFetchedImage?: boolean;
	competition?: Competition | null;
	competitionPosition?: number | null;
}

export interface ApiMatch {
	id: number;
	startTime: string;
	normalizedSeason: number;
	status: string;
	withOvertime?: boolean;
	minute?: number | string | null;
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
	slug?: string | null;
	country?: string | null;
	logo_source_url?: string | null;
	table: TableEntry | null;
	last_matches: RecentMatch[];
}

export interface CompetitionMetadata {
	competition_id: number | null;
	competition_slug: string | null;
	competition_type: string | null;
	competition_level: number | null;
	competition_display_order: number | null;
	country_id: number | null;
	country: string | null;
	country_slug: string | null;
}

export interface CollectedMatch extends CompetitionMetadata {
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

export interface TeamLogo {
	data: Uint8Array;
}
