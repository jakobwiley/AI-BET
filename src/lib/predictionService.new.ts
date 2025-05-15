import { Game, Prediction, PredictionType } from '../models/types.js';

// Team statistics interface
export interface TeamStats {
  wins: number;
  losses: number;
  homeWins?: number;
  homeLosses?: number;
  awayWins?: number;
  awayLosses?: number;
  pointsFor: number;
  pointsAgainst: number;
  lastTenGames: string; // e.g., "7-3"
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
  // Park factor properties
  parkFactorHomeRuns?: number;
  awayRuns?: number;
  homeHits?: number;
  awayHits?: number;
  homeDoubles?: number;
  awayDoubles?: number;
  homeTriples?: number;
  awayTriples?: number;
  homeWalks?: number;
  awayWalks?: number;
  homeStrikeouts?: number;
  awayStrikeouts?: number;
  // Advanced batting metrics
  ops?: number;
  wOBA?: number;
  wRCPlus?: number;
  teamHomeRuns?: number;
  rbi?: number;
  stolenBases?: number;
  strikeOutRate?: number;
  walkRate?: number;
  babip?: number;
  iso?: number;
  hardHitRate?: number;
  barrelRate?: number;
  exitVelocity?: number;
  launchAngle?: number;
  // Advanced pitching metrics
  whip?: number;
  kPer9?: number;
  bbPer9?: number;
  hrPer9?: number;
  fip?: number;
  xFIP?: number;
  groundBallRate?: number;
  flyBallRate?: number;
  spinRate?: number;
  pitchVelocity?: number;
  // Situational stats
  situationalStats?: {
    home: {
      avg: number;
      ops: number;
      wOBA: number;
      hardHitRate: number;
      barrelRate: number;
    };
    away: {
      avg: number;
      ops: number;
      wOBA: number;
      hardHitRate: number;
      barrelRate: number;
    };
    day: {
      avg: number;
      ops: number;
      wOBA: number;
      hardHitRate: number;
      barrelRate: number;
    };
    night: {
      avg: number;
      ops: number;
      wOBA: number;
      hardHitRate: number;
      barrelRate: number;
    };
  };
  // Bullpen stats
  bullpenStats?: {
    era: number;
    whip: number;
    kPer9: number;
    bbPer9: number;
    inningsPitched: number;
    inheritedRunners: number;
    inheritedRunnersScored: number;
    holds: number;
    saves: number;
    blownSaves: number;
  };
  // Weather impact
  weatherImpact?: {
    avgRunsInGoodWeather: number;
    avgRunsInBadWeather: number;
    gamesInGoodWeather: number;
    gamesInBadWeather: number;
  };
  // Player statistics
  keyPlayers?: {
    batting: Array<{
      avg: string;
      obp: string;
      slg: string;
      ops: string;
      wOBA: string;
      wRCPlus: number;
      war: string;
      hardHitRate?: string;
      barrelRate?: string;
      exitVelocity?: string;
      launchAngle?: string;
      strikeOutRate?: string;
      walkRate?: string;
      babip?: string;
    }>;
    pitching: Array<{
      era: string;
      whip: string;
      fip: string;
      xfip: string;
      k9: string;
      bb9: string;
      war: string;
      groundBallRate?: string;
      flyBallRate?: string;
      hardHitRate?: string;
      barrelRate?: string;
      exitVelocity?: string;
      spinRate?: string;
      pitchVelocity?: string;
      kPer9?: string;
      bbPer9?: string;
      hrPer9?: string;
    }>;
  };
}

// Head-to-head statistics interface
export interface H2HStats {
  homeTeamWins: number;
  awayTeamWins: number;
  totalGames: number;
  lastMeetingDate: string;
  lastMeetingResult: string;
  averagePointsHome?: number;
  averagePointsAway?: number;
  // Sport-specific stats
  averageTotalPoints?: number; // NBA
  averagePointsDiff?: number; // NBA
  averageRunsScored?: number; // MLB
  averageRunsAllowed?: number; // MLB
  averageRunsDiff?: number; // MLB
} 