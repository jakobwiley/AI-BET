import axios from 'axios';
import type { Game, Prediction, SportType, PredictionType, GameStatus, PredictionOutcome } from '@prisma/client';
import type { PlayerProp, PlayerPropType } from '../models/types.ts';
import { handleSportsApiError } from './errors.ts';
import { OddsApiService } from './oddsApi.ts';
import { MLBStatsService } from './mlbStatsApi.ts';
import type { TeamStats } from '../types/teamStats.ts';

// API keys from environment variables
const SPORTS_DATA_API_KEY = process.env.SPORTS_DATA_API_KEY;
const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

// Base URLs for the APIs
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

interface MLBScheduleResponse {
  dates: Array<{
    games: Array<{
      gamePk: number;
      gameDate: string;
      status: {
        statusCode: string;
        detailedState: string;
      };
      teams: {
        home: {
          team: {
            id: number;
            name: string;
          };
          score?: number;
          probablePitcher?: {
            id: number;
          };
        };
        away: {
          team: {
            id: number;
            name: string;
          };
          score?: number;
          probablePitcher?: {
            id: number;
          };
        };
      };
    }>;
  }>;
}

/**
 * Service for fetching sports data from external APIs
 */
export class SportsApiService {
  private static oddsService: OddsApiService | null = null;

  private static getOddsService(): OddsApiService {
    if (!this.oddsService) {
      const apiKey = process.env.THE_ODDS_API_KEY;
      const apiHost = process.env.ODDS_API_HOST;
      this.oddsService = new OddsApiService(apiKey, apiHost);
    }
    return this.oddsService;
  }

  /**
   * Fetch upcoming games for a specific sport
   */
  static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    if (sport !== 'MLB') throw new Error('Only MLB is supported.');
    
    try {
      const response = await axios.get<MLBScheduleResponse>(`${MLB_API_BASE_URL}/schedule`, {
        params: {
          sportId: 1,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          gameType: 'R'
        }
      });

      const games: Game[] = [];
      const dates = response.data.dates || [];

      for (const date of dates) {
        for (const game of date.games) {
          const homeTeam = game.teams.home.team;
          const awayTeam = game.teams.away.team;
          
          games.push({
            id: `mlb-game-${game.gamePk}`,
            sport: 'MLB',
            homeTeamId: homeTeam.id.toString(),
            awayTeamId: awayTeam.id.toString(),
            homeTeamName: homeTeam.name,
            awayTeamName: awayTeam.name,
            gameDate: new Date(game.gameDate),
            startTime: game.gameDate,
            status: this.mapGameStatus(game.status.statusCode),
            createdAt: new Date(),
            updatedAt: new Date(),
            oddsJson: null,
            probableHomePitcherId: game.teams.home.probablePitcher?.id || null,
            probableAwayPitcherId: game.teams.away.probablePitcher?.id || null,
            awayScore: game.teams.away.score || null,
            homeScore: game.teams.home.score || null
          });
        }
      }

      return games;
    } catch (error) {
      handleSportsApiError(error, 'fetching upcoming MLB games');
      throw error;
    }
  }

  /**
   * Get predictions for a specific game
   */
  static async getPredictionsForGame(gameId: string): Promise<Prediction[]> {
    try {
      const gamePk = parseInt(gameId.split('-')[2]);
      const [homeTeamName, awayTeamName] = gameId.split('-');
      
      const [homeStats, awayStats] = await Promise.all([
        MLBStatsService.getTeamStats(homeTeamName, { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }),
        MLBStatsService.getTeamStats(awayTeamName, { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
      ]);

      if (!homeStats || !awayStats) {
        throw new Error('Could not fetch team stats');
      }

      const predictions: Prediction[] = [];
      
      // Calculate spread prediction
      const spreadValue = this.calculateSpreadPrediction(homeStats, awayStats);
      predictions.push({
        id: `prediction-${gameId}-SPREAD`,
        gameId,
        predictionType: 'SPREAD',
        predictionValue: spreadValue.toString(),
        confidence: this.calculateConfidence(homeStats, awayStats),
        reasoning: this.generateSpreadReasoning(homeStats, awayStats),
        outcome: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectionJson: null
      });

      // Calculate moneyline prediction
      const moneylineValue = this.calculateMoneylinePrediction(homeStats, awayStats);
      predictions.push({
        id: `prediction-${gameId}-MONEYLINE`,
        gameId,
        predictionType: 'MONEYLINE',
        predictionValue: moneylineValue.toString(),
        confidence: this.calculateConfidence(homeStats, awayStats),
        reasoning: this.generateMoneylineReasoning(homeStats, awayStats),
        outcome: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectionJson: null
      });

      // Calculate total prediction
      const totalValue = this.calculateTotalPrediction(homeStats, awayStats);
      predictions.push({
        id: `prediction-${gameId}-TOTAL`,
        gameId,
        predictionType: 'TOTAL',
        predictionValue: totalValue.toString(),
        confidence: this.calculateConfidence(homeStats, awayStats),
        reasoning: this.generateTotalReasoning(homeStats, awayStats),
        outcome: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectionJson: null
      });

      return predictions;
    } catch (error) {
      handleSportsApiError(error, `generating predictions for game ${gameId}`);
      throw error;
    }
  }

  /**
   * Get player props for a specific game
   */
  static async getPlayerPropsForGame(gameId: string, sport: SportType): Promise<PlayerProp[]> {
    if (sport !== 'MLB') throw new Error('Only MLB is supported.');
    
    try {
      const gamePk = parseInt(gameId.split('-')[2]);
      const pitchers = await MLBStatsService.getActualStartingPitchers(gamePk);
      
      if (!pitchers) {
        throw new Error('Could not determine starting pitchers');
      }

      const [homePitcher, awayPitcher] = await Promise.all([
        MLBStatsService.getPitcherStats(pitchers.homePitcherId),
        MLBStatsService.getPitcherStats(pitchers.awayPitcherId)
      ]);

      if (!homePitcher || !awayPitcher) {
        throw new Error('Could not fetch pitcher stats');
      }

      const props: PlayerProp[] = [];

      // Add pitcher props
      props.push(...this.generatePitcherProps(gameId, pitchers.homePitcherId, homePitcher));
      props.push(...this.generatePitcherProps(gameId, pitchers.awayPitcherId, awayPitcher));

      return props;
    } catch (error) {
      handleSportsApiError(error, `fetching player props for game ${gameId}`);
      throw error;
    }
  }

  private static mapGameStatus(mlbStatusCode: string): GameStatus {
    const statusMap: Record<string, GameStatus> = {
      'S': 'SCHEDULED',
      'I': 'IN_PROGRESS',
      'F': 'FINAL',
      'D': 'POSTPONED',
      'C': 'CANCELLED'
    };
    return statusMap[mlbStatusCode] || 'SCHEDULED';
  }

  private static calculateSpreadPrediction(homeStats: TeamStats, awayStats: TeamStats): number {
    // Implement spread calculation logic based on team stats
    const homeAdvantage = 0.5; // Home field advantage in runs
    const spread = (homeStats.runsScored! - homeStats.runsAllowed!) - 
                  (awayStats.runsScored! - awayStats.runsAllowed!) + 
                  homeAdvantage;
    return Math.round(spread * 2) / 2; // Round to nearest 0.5
  }

  private static calculateMoneylinePrediction(homeStats: TeamStats, awayStats: TeamStats): number {
    // Implement moneyline calculation logic based on team stats
    const homeWinPct = homeStats.winPercentage;
    const awayWinPct = awayStats.winPercentage;
    const homeAdvantage = 0.05; // 5% home field advantage
    
    const homeWinProb = (homeWinPct + homeAdvantage) / (homeWinPct + awayWinPct + homeAdvantage);
    const impliedOdds = homeWinProb / (1 - homeWinProb);
    
    return Math.round(impliedOdds * 100);
  }

  private static calculateTotalPrediction(homeStats: TeamStats, awayStats: TeamStats): number {
    // Implement total runs prediction logic based on team stats
    const homeRunsPerGame = homeStats.runsScored! / (homeStats.wins + homeStats.losses);
    const awayRunsPerGame = awayStats.runsScored! / (awayStats.wins + awayStats.losses);
    const total = (homeRunsPerGame + awayRunsPerGame) * 0.95; // Slight under adjustment
    return Math.round(total * 2) / 2; // Round to nearest 0.5
  }

  private static calculateConfidence(homeStats: TeamStats, awayStats: TeamStats): number {
    // Implement confidence calculation based on sample size and consistency
    const gamesPlayed = Math.min(homeStats.wins + homeStats.losses, awayStats.wins + awayStats.losses);
    const baseConfidence = 0.75;
    const sampleSizeFactor = Math.min(gamesPlayed / 20, 1); // Max confidence at 20 games
    return Math.round((baseConfidence + (0.15 * sampleSizeFactor)) * 100) / 100;
  }

  private static generateSpreadReasoning(homeStats: TeamStats, awayStats: TeamStats): string {
    return `Based on ${homeStats.wins + homeStats.losses} games played, home team has scored ${homeStats.runsScored} runs and allowed ${homeStats.runsAllowed}. Away team has scored ${awayStats.runsScored} runs and allowed ${awayStats.runsAllowed} in ${awayStats.wins + awayStats.losses} games.`;
  }

  private static generateMoneylineReasoning(homeStats: TeamStats, awayStats: TeamStats): string {
    return `Home team has a ${(homeStats.winPercentage * 100).toFixed(1)}% win rate, while away team has a ${(awayStats.winPercentage * 100).toFixed(1)}% win rate.`;
  }

  private static generateTotalReasoning(homeStats: TeamStats, awayStats: TeamStats): string {
    const homeRunsPerGame = (homeStats.runsScored! / (homeStats.wins + homeStats.losses)).toFixed(1);
    const awayRunsPerGame = (awayStats.runsScored! / (awayStats.wins + awayStats.losses)).toFixed(1);
    return `Home team averages ${homeRunsPerGame} runs per game, while away team averages ${awayRunsPerGame} runs per game.`;
  }

  private static generatePitcherProps(gameId: string, pitcherId: number, stats: any): PlayerProp[] {
    const props: PlayerProp[] = [];
    
    // Strikeouts prop
    props.push({
      id: `prop-${gameId}-${pitcherId}-STRIKEOUTS`,
      gameId,
      playerId: pitcherId.toString(),
      playerName: stats.name,
      teamId: stats.teamId.toString(),
      propType: 'STRIKEOUTS',
      line: Math.round(stats.kPer9 * 5) / 5, // Round to nearest 0.2
      prediction: Math.round(stats.kPer9 * 5) / 5,
      confidence: Math.round((0.7 + (stats.gamesPlayed / 100)) * 100),
      reasoning: `Pitcher averages ${stats.kPer9} strikeouts per 9 innings over ${stats.gamesPlayed} games.`,
      createdAt: new Date().toISOString(),
      outcome: 'PENDING'
    });

    // Walks prop
        props.push({
      id: `prop-${gameId}-${pitcherId}-WALKS`,
          gameId,
      playerId: pitcherId.toString(),
      playerName: stats.name,
      teamId: stats.teamId.toString(),
      propType: 'WALKS',
      line: Math.round(stats.bbPer9 * 5) / 5,
      prediction: Math.round(stats.bbPer9 * 5) / 5,
      confidence: Math.round((0.7 + (stats.gamesPlayed / 100)) * 100),
      reasoning: `Pitcher averages ${stats.bbPer9} walks per 9 innings over ${stats.gamesPlayed} games.`,
          createdAt: new Date().toISOString(),
          outcome: 'PENDING'
        });
    
    return props;
  }
} 