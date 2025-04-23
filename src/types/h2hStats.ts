export interface H2HStats {
  team1Id: string;
  team2Id: string;
  season: number;
  homeTeamWins: number;
  awayTeamWins: number;
  totalGames: number;
  lastMeetingDate: string;
  lastMeetingResult: string;
  averageTotalPoints?: number;
  averageRunsScored?: number;
  team1PointsScored: number;
  team2PointsScored: number;
  team1PointsAllowed: number;
  team2PointsAllowed: number;
  avgMargin: number;
  avgTotal: number;
} 