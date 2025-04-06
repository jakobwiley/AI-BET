export enum SportType {
  NBA = 'NBA',
  MLB = 'MLB'
}

export enum PredictionType {
  SPREAD = 'SPREAD',
  MONEYLINE = 'MONEYLINE',
  TOTAL = 'TOTAL'
}

export enum PlayerPropType {
  // NBA
  POINTS = 'POINTS',
  REBOUNDS = 'REBOUNDS',
  ASSISTS = 'ASSISTS',
  STEALS = 'STEALS',
  BLOCKS = 'BLOCKS',
  THREES = 'THREES',
  
  // MLB
  HITS = 'HITS',
  HOME_RUNS = 'HOME_RUNS',
  RBIS = 'RBIS',
  STRIKEOUTS = 'STRIKEOUTS',
  WALKS = 'WALKS'
}

export interface Game {
  id: string;
  sport: SportType;
  gameDate: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINAL';
  predictions: Prediction[];
  playerProps: PlayerProp[];
}

export interface Prediction {
  id: string;
  gameId: string;
  predictionType: PredictionType;
  predictionValue: string;
  confidence: number;
  reasoning: string;
  createdAt: Date;
  game: Game;
}

export interface PlayerProp {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  propType: PlayerPropType;
  overUnderValue: number;
  predictionValue: 'OVER' | 'UNDER';
  confidence: number;
  reasoning: string;
  createdAt: Date;
  game: Game;
} 