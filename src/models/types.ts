export type SportType = 'MLB' | 'NBA';

export type PredictionType = 'SPREAD' | 'TOTAL' | 'MONEYLINE';

export type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' | 'POSTPONED' | 'CANCELLED';

export type PredictionOutcome = 'WIN' | 'LOSS' | 'PUSH' | 'PENDING';


export type PlayerPropType =
  | 'POINTS'
  | 'REBOUNDS'
  | 'ASSISTS'
  | 'BLOCKS'
  | 'STEALS'
  | 'TURNOVERS'
  | 'THREE_POINTERS'
  | 'HITS'
  | 'RUNS'
  | 'RBI'
  | 'STRIKEOUTS'
  | 'HOME_RUNS'
  | 'STOLEN_BASES'
  | 'WALKS';

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
      homeSpread: string;
      awaySpread: string;
      homeOdds: string;
      awayOdds: string;
    };
    total?: {
      overUnder: string;
      overOdds: string;
      underOdds: string;
    };
    moneyline?: {
      homeOdds: string;
      awayOdds: string;
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
  outcome?: PredictionOutcome;
  createdAt: string;
  updatedAt?: string;
  projectionJson?: {
    projectedTeam?: string;
    projectedMargin?: number;
    projectedHome?: number;
    projectedAway?: number;
    projectedTotal?: number;
    projectedWinner?: string;
    winProbability?: number;
  };
  advancedMetrics?: Record<string, any>;
  historicalData?: Record<string, any>;
  bettingMarketData?: Record<string, any>;
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
  outcome?: PredictionOutcome;
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
  game: Game;} 
