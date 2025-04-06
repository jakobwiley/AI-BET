export type SportType = 'NBA' | 'MLB';

export type GameStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export type PredictionType = 'SPREAD' | 'MONEYLINE' | 'OVER_UNDER' | 'PLAYER_PROP';

export type PropType = 
  | 'POINTS' 
  | 'REBOUNDS' 
  | 'ASSISTS' 
  | 'STRIKEOUTS' 
  | 'HITS' 
  | 'HOME_RUNS' 
  | 'TOTAL_BASES' 
  | 'STOLEN_BASES' 
  | 'OTHER';

export type PredictionOutcome = 'WIN' | 'LOSS' | 'PUSH' | 'VOID';

export interface Game {
  id: string;
  sport: SportType;
  gameDate: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  status: GameStatus;
  predictions: Prediction[];
  playerProps: PlayerProp[];
}

export interface Prediction {
  id: string;
  gameId: string;
  predictionType: PredictionType;
  predictionValue: string;
  confidence: number; // 0-1 value representing confidence
  reasoning: string;
  outcome?: PredictionOutcome;
  createdAt: Date;
  game: Game;
}

export interface PlayerProp {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  propType: PropType;
  overUnderValue: number;
  predictionValue: string;
  confidence: number;
  reasoning: string;
  outcome?: PredictionOutcome;
  createdAt: Date;
  game: Game;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  teamId?: string;
  playerId?: string;
  createdAt: Date;
  user: User;
} 