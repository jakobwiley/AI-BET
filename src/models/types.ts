export type SportType = 'NBA' | 'MLB';

export type PredictionType = 'SPREAD' | 'MONEYLINE' | 'TOTAL';

export enum GameStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINAL = 'FINAL',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED'
}

export enum PlayerPropType {
  POINTS = 'POINTS',
  REBOUNDS = 'REBOUNDS',
  ASSISTS = 'ASSISTS',
  BLOCKS = 'BLOCKS',
  STEALS = 'STEALS',
  TURNOVERS = 'TURNOVERS',
  THREE_POINTERS = 'THREE_POINTERS',
  HITS = 'HITS',
  RUNS = 'RUNS',
  RBI = 'RBI',
  STRIKEOUTS = 'STRIKEOUTS',
  HOME_RUNS = 'HOME_RUNS',
  STOLEN_BASES = 'STOLEN_BASES',
  WALKS = 'WALKS'
}

export interface Game {
  id: string;
  sport: SportType;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  gameDate: string;
  startTime: string;
  status: GameStatus;
  predictions?: Prediction[];
  odds?: {
    spread?: {
      homeSpread: number;
      awaySpread: number;
      homeOdds: number;
      awayOdds: number;
    };
    total?: {
      overUnder: number;
      overOdds: number;
      underOdds: number;
    };
    moneyline?: {
      homeOdds: number;
      awayOdds: number;
    };
  };
  probableHomePitcherId?: number;
  probableAwayPitcherId?: number;
  probableHomePitcherName?: string;
  probableAwayPitcherName?: string;
}

export interface Prediction {
  id: string;
  gameId: string;
  predictionType: PredictionType;
  predictionValue: string;
  confidence: number;
  grade: string;
  reasoning: string;
  outcome?: 'WIN' | 'LOSS' | 'PUSH';
  createdAt: string;
  updatedAt?: string;
}

export interface PlayerProp {
  id?: string;
  gameId?: string;
  playerId?: string;
  playerName: string;
  teamId?: string;
  propType: PlayerPropType;
  line: number;
  prediction: number;
  confidence?: number;
  reasoning?: string;
  createdAt?: string;
  game?: Game;
  outcome?: 'WIN' | 'LOSS' | 'PENDING';
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  conference?: string;
  division?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  jerseyNumber?: string;
  teamId: string;
  height?: string;
  weight?: string;
  dateOfBirth?: string;
  imageUrl?: string;
  stats?: Record<string, any>;
}

export interface PredictionResponse {
  game: Game;
} 