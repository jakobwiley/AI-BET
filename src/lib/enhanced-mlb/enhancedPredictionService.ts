import { Game, Prediction, PredictionType } from '../../models/types.js';
import { MLBStatsService } from '../mlbStatsApi.js';
import { CacheService } from '../cacheService.js';
import { EnsembleModel } from './ensembleModel.js';

interface PredictionFactors {
  // Team Factors
  teamStrength: number;
  homeAdvantage: number;
  recentForm: number;
  parkFactor: number;
  
  // Pitching Factors
  startingPitcherMatchup: number;
  bullpenStrength: number;
  restDays: number;
  
  // Batting Factors
  lineupStrength: number;
  platoonAdvantage: number;
  situationalHitting: number;
  
  // Advanced Metrics
  expectedRuns: number;
  winProbability: number;
  valueRating: number;
}

export class EnhancedPredictionService {
  private static readonly CACHE_TTL = 3600; // 1 hour
  private ensembleModel: EnsembleModel;

  constructor() {
    this.ensembleModel = new EnsembleModel({
      minModels: 3,
      confidenceThreshold: 0.70,
      performanceWeight: 0.4,
      calibrationWeight: 0.3,
      recencyWeight: 0.3
    });
  }

  /**
   * Generate comprehensive prediction for a game
   */
  public async generatePrediction(game: Game): Promise<Prediction> {
    try {
      // Get pitcher IDs with fallback
      const homePitcherId = game.probableHomePitcherId;
      const awayPitcherId = game.probableAwayPitcherId;
      if (!homePitcherId || !awayPitcherId) {
        throw new Error('Missing probable pitcher IDs for this game');
      }

      // Get odds with fallback
      const moneyline = game.odds?.moneyline?.homeOdds && game.odds?.moneyline?.awayOdds
        ? { home: Number(game.odds.moneyline.homeOdds), away: Number(game.odds.moneyline.awayOdds) }
        : { home: 0, away: 0 };
      const runline = game.odds?.spread?.homeSpread && game.odds?.spread?.awaySpread
        ? { home: Number(game.odds.spread.homeSpread), away: Number(game.odds.spread.awaySpread) }
        : { home: 0, away: 0 };
      const total = game.odds?.total?.overUnder ? Number(game.odds.total.overUnder) : 0;

      // Get all required data
      const [homeTeamStats, awayTeamStats, homePitcher, awayPitcher] = await Promise.all([
        MLBStatsService.getTeamStats(game.homeTeamId),
        MLBStatsService.getTeamStats(game.awayTeamId),
        MLBStatsService.getPitcherStats(homePitcherId),
        MLBStatsService.getPitcherStats(awayPitcherId)
      ]);

      // Calculate prediction factors
      const factors = await this.calculatePredictionFactors(
        game,
        homeTeamStats,
        awayTeamStats,
        homePitcher,
        awayPitcher,
        moneyline,
        runline,
        total
      );

      // Generate base predictions for different bet types
      const predictions = await Promise.all([
        this.generateMoneylinePrediction(game, factors),
        this.generateRunLinePrediction(game, factors),
        this.generateTotalPrediction(game, factors, total)
      ]);

      // Use ensemble model to combine predictions
      const ensemblePrediction = await this.ensembleModel.generatePrediction(game, predictions);

      // Add detailed reasoning
      ensemblePrediction.reasoning = this.generateDetailedReasoning(factors, predictions);

      return ensemblePrediction;
    } catch (error) {
      console.error('Error generating prediction:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive prediction factors
   * Now includes odds and total as arguments
   */
  private async calculatePredictionFactors(
    game: Game,
    homeTeamStats: any,
    awayTeamStats: any,
    homePitcher: any,
    awayPitcher: any,
    moneyline: { home: number; away: number },
    runline: { home: number; away: number },
    total: number
  ): Promise<PredictionFactors> {
    // Team strength calculation
    const teamStrength = this.calculateTeamStrength(homeTeamStats, awayTeamStats);
    // Home advantage with park factor (use homeTeamName as proxy for venue)
    const homeAdvantage = this.calculateHomeAdvantage(homeTeamStats, game.homeTeamName);
    // Recent form analysis
    const recentForm = this.calculateRecentForm(homeTeamStats, awayTeamStats);
    // Starting pitcher matchup analysis
    const startingPitcherMatchup = await this.analyzePitcherMatchup(
      homePitcher,
      awayPitcher,
      homeTeamStats,
      awayTeamStats
    );
    // Bullpen analysis
    const bullpenStrength = this.analyzeBullpenStrength(homeTeamStats, awayTeamStats);
    // Rest days impact
    const restDays = this.calculateRestDaysImpact(game);
    // Lineup strength
    const lineupStrength = await this.analyzeLineupStrength(game);
    // Platoon advantage
    const platoonAdvantage = this.calculatePlatoonAdvantage(
      homePitcher,
      awayPitcher,
      homeTeamStats,
      awayTeamStats
    );
    // Situational hitting
    const situationalHitting = this.analyzeSituationalHitting(homeTeamStats, awayTeamStats);
    // Expected runs calculation
    const expectedRuns = this.calculateExpectedRuns(
      homeTeamStats,
      awayTeamStats,
      homePitcher,
      awayPitcher
    );
    // Win probability
    const winProbability = this.calculateWinProbability(
      teamStrength,
      homeAdvantage,
      startingPitcherMatchup,
      bullpenStrength
    );
    // Value rating
    const valueRating = this.calculateValueRating(
      winProbability,
      moneyline,
      runline,
      total
    );
    return {
      teamStrength,
      homeAdvantage,
      recentForm,
      parkFactor: homeAdvantage,
      startingPitcherMatchup,
      bullpenStrength,
      restDays,
      lineupStrength,
      platoonAdvantage,
      situationalHitting,
      expectedRuns,
      winProbability,
      valueRating
    };
  }

  /**
   * Generate detailed reasoning for the prediction
   */
  private generateDetailedReasoning(
    factors: PredictionFactors,
    predictions: Prediction[]
  ): string {
    const reasoning = [
      'Prediction Analysis:',
      `Team Strength: ${(factors.teamStrength * 100).toFixed(1)}%`,
      `Home Advantage: ${(factors.homeAdvantage * 100).toFixed(1)}%`,
      `Recent Form: ${(factors.recentForm * 100).toFixed(1)}%`,
      `Starting Pitcher Matchup: ${(factors.startingPitcherMatchup * 100).toFixed(1)}%`,
      `Bullpen Strength: ${(factors.bullpenStrength * 100).toFixed(1)}%`,
      `Expected Runs: ${factors.expectedRuns.toFixed(1)}`,
      `Win Probability: ${(factors.winProbability * 100).toFixed(1)}%`,
      `Value Rating: ${(factors.valueRating * 100).toFixed(1)}%`
    ].join('\n');

    return reasoning;
  }

  // Helper methods for factor calculations
  private calculateTeamStrength(homeStats: any, awayStats: any): number {
    // Implementation using team stats
    return 0.5; // Placeholder
  }

  private calculateHomeAdvantage(teamStats: any, venue: string): number {
    // Implementation using park factors and home/away splits
    return 0.5; // Placeholder
  }

  private calculateRecentForm(homeStats: any, awayStats: any): number {
    // Implementation using recent performance
    return 0.5; // Placeholder
  }

  private async analyzePitcherMatchup(
    homePitcher: any,
    awayPitcher: any,
    homeTeamStats: any,
    awayTeamStats: any
  ): Promise<number> {
    // Implementation using pitcher stats and team batting stats
    return 0.5; // Placeholder
  }

  private analyzeBullpenStrength(homeStats: any, awayStats: any): number {
    // Implementation using bullpen metrics
    return 0.5; // Placeholder
  }

  private calculateRestDaysImpact(game: Game): number {
    // Implementation using rest days data
    return 0.5; // Placeholder
  }

  private async analyzeLineupStrength(game: Game): Promise<number> {
    // Implementation using lineup data
    return 0.5; // Placeholder
  }

  private calculatePlatoonAdvantage(
    homePitcher: any,
    awayPitcher: any,
    homeTeamStats: any,
    awayTeamStats: any
  ): number {
    // Implementation using platoon splits
    return 0.5; // Placeholder
  }

  private analyzeSituationalHitting(homeStats: any, awayStats: any): number {
    // Implementation using situational stats
    return 0.5; // Placeholder
  }

  private calculateExpectedRuns(
    homeStats: any,
    awayStats: any,
    homePitcher: any,
    awayPitcher: any
  ): number {
    // Implementation using run expectancy models
    return 0.5; // Placeholder
  }

  private calculateWinProbability(
    teamStrength: number,
    homeAdvantage: number,
    pitcherMatchup: number,
    bullpenStrength: number
  ): number {
    // Implementation using probability models
    return 0.5; // Placeholder
  }

  private calculateValueRating(
    winProbability: number,
    moneyline: { home: number; away: number },
    runline: { home: number; away: number },
    total: number
  ): number {
    // Implementation using value betting models
    return 0.5; // Placeholder
  }

  private async generateMoneylinePrediction(
    game: Game,
    factors: PredictionFactors
  ): Promise<Prediction> {
    // Implementation for moneyline prediction
    return {
      id: `${game.id}-moneyline`,
      gameId: game.id,
      predictionType: 'MONEYLINE',
      predictionValue: factors.winProbability > 0.5 ? 'HOME' : 'AWAY',
      confidence: Math.round(factors.winProbability * 100),
      grade: this.calculateGrade(factors.winProbability),
      reasoning: 'Moneyline prediction based on win probability',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private async generateRunLinePrediction(
    game: Game,
    factors: PredictionFactors
  ): Promise<Prediction> {
    // Implementation for run line prediction
    return {
      id: `${game.id}-runline`,
      gameId: game.id,
      predictionType: 'SPREAD',
      predictionValue: factors.winProbability > 0.5 ? 'HOME' : 'AWAY',
      confidence: Math.round(factors.winProbability * 100),
      grade: this.calculateGrade(factors.winProbability),
      reasoning: 'Run line prediction based on expected margin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private async generateTotalPrediction(
    game: Game,
    factors: PredictionFactors,
    total: number
  ): Promise<Prediction> {
    // Implementation for total prediction
    return {
      id: `${game.id}-total`,
      gameId: game.id,
      predictionType: 'TOTAL',
      predictionValue: factors.expectedRuns > total ? 'OVER' : 'UNDER',
      confidence: Math.round(factors.winProbability * 100),
      grade: this.calculateGrade(factors.winProbability),
      reasoning: 'Total prediction based on expected runs',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private calculateGrade(probability: number): string {
    if (probability >= 0.85) return 'A+';
    if (probability >= 0.80) return 'A';
    if (probability >= 0.75) return 'A-';
    if (probability >= 0.70) return 'B+';
    if (probability >= 0.65) return 'B';
    if (probability >= 0.60) return 'B-';
    if (probability >= 0.55) return 'C+';
    if (probability >= 0.50) return 'C';
    return 'C-';
  }

  /**
   * Documentation: Required data for world-class MLB prediction
   * - Game: id, homeTeamId, awayTeamId, homeTeamName, awayTeamName, odds (moneyline, spread, total), probableHomePitcherId, probableAwayPitcherId
   * - TeamStats: full team stats for both teams
   * - PitcherStats: for both probable pitchers
   * - Advanced analytics: park factors (by homeTeamName), situational stats, bullpen usage, batter-pitcher matchups
   */
} 