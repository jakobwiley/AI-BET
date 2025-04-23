export interface TeamStats {
  teamId: string;
  season: number;
  wins: number;
  losses: number;
  homeWins?: number;
  homeLosses?: number;
  awayWins?: number;
  awayLosses?: number;
  pointsFor: number;
  pointsAgainst: number;
  lastTenGames: string;
  streak: number;
  winPercentage: number;
  homeWinPercentage?: number;
  awayWinPercentage?: number;
  // Sport-specific stats
  pace?: number; // NBA pace
  offensiveRating?: number;
  defensiveRating?: number;
  // MLB specific
  runsScored?: number;
  runsAllowed?: number;
  battingAverage?: number;
  era?: number;
  avgRunsScored?: number;
  avgRunsAllowed?: number;
  teamERA?: number;
  teamWHIP?: number;
  avgVsLHP?: number;
  opsVsLHP?: number;
  avgVsRHP?: number;
  opsVsRHP?: number;
  lastTenWins?: number;
  lastTenLosses?: number;
} 