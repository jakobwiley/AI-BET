import { SportType, GameStatus } from '@prisma/client';

export interface Game {
  id: string;
  sport: SportType;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
  startTime: string;
  status: GameStatus;
  odds: {
    homeSpread: number;
    awaySpread: number;
    homeMoneyline: number;
    awayMoneyline: number;
    total: number;
    overOdds: number;
    underOdds: number;
  };
}
