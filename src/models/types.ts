export type SportType = 'NBA' | 'MLB';

export type PredictionType = 'SPREAD' | 'MONEYLINE' | 'TOTAL' | 'OVER_UNDER';

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
  startTime?: string;
  gameDate: string;
  status?: string;
  predictions?: Prediction[];
  playerProps?: PlayerProp[];
  spread?: {
    home: number;
    away: number;
  };
  moneyline?: {
    home: number;
    away: number;
  };
  total?: number;
}

export interface Prediction {
  id: string;
  gameId: string;
  predictionType: 'SPREAD' | 'MONEYLINE' | 'TOTAL' | 'OVER_UNDER';
  predictionValue: string;
  confidence: number;
  reasoning?: string;
  outcome?: 'WIN' | 'LOSS' | 'PUSH';
  createdAt: string;
}

export interface PlayerProp {
  id?: string;
  gameId?: string;
  playerId?: string;
  playerName: string;
  teamId?: string;
  propType: PlayerPropType;
  overUnderValue: number;
  predictionValue: 'OVER' | 'UNDER';
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