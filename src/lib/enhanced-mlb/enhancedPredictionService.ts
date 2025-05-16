import type { Game, Prediction, PredictionType } from '../../models/types.ts';
import { MLBStatsService } from '../mlbStatsApi.ts';
import { CacheService } from '../cacheService.ts';
import { EnsembleModel } from './ensembleModel.ts';

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
      confidenceThreshold: 0.65,
      performanceWeight: 0.5,
      calibrationWeight: 0.3,
      recencyWeight: 0.2
    });
  }

  /**
   * Generate comprehensive prediction for a game
   */
  public async generatePrediction(game: Game): Promise<Prediction> {
    try {
      // Get pitcher IDs with fallback
      let homePitcherId = game.probableHomePitcherId;
      let awayPitcherId = game.probableAwayPitcherId;

      // If missing and game is in the past, fetch actual starting pitchers
      const now = new Date();
      const gameDate = new Date(game.gameDate);
      if ((!homePitcherId || !awayPitcherId) && gameDate < now) {
        if (game.id && game.id.startsWith('mlb-game-')) {
          // Extract MLB gamePk from id
          const gamePk = Number(game.id.replace('mlb-game-', ''));
          if (!isNaN(gamePk)) {
            const actualPitchers = await MLBStatsService.getActualStartingPitchers(gamePk);
            if (actualPitchers) {
              homePitcherId = actualPitchers.homePitcherId;
              awayPitcherId = actualPitchers.awayPitcherId;
            }
          }
        }
      }
      if (!homePitcherId || !awayPitcherId) {
        throw new Error('Missing starting pitcher IDs for this game');
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
    // Calculate expected total runs using our advanced metrics
    const expectedTotal = this.calculateExpectedTotal(
      factors.expectedRuns,
      factors.parkFactor,
      factors.startingPitcherMatchup,
      factors.bullpenStrength,
      factors.lineupStrength,
      factors.platoonAdvantage,
      factors.situationalHitting
    );

    // Determine if we should predict OVER or UNDER based on our expected total vs the line
    const direction = expectedTotal > total ? 'OVER' : 'UNDER';
    
    // Calculate confidence based on how far our expected total is from the line
    // and the strength of our supporting factors
    const confidence = this.calculateTotalConfidence(
      expectedTotal,
      total,
      factors.startingPitcherMatchup,
      factors.bullpenStrength,
      factors.parkFactor
    );

    return {
      id: `${game.id}-total`,
      gameId: game.id,
      predictionType: 'TOTAL',
      predictionValue: `${direction.charAt(0).toLowerCase()}${total}`,
      confidence,
      grade: this.calculateGrade(confidence),
      reasoning: this.generateTotalReasoning(
        expectedTotal,
        total,
        direction,
        factors,
        game
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private calculateExpectedTotal(
    expectedRuns: number,
    parkFactor: number,
    startingPitcherMatchup: number,
    bullpenStrength: number,
    lineupStrength: number,
    platoonAdvantage: number,
    situationalHitting: number
  ): number {
    // Base expected runs adjusted for park factor
    let total = expectedRuns * parkFactor;

    // Adjust for starting pitcher matchup (0-1 scale, 1 being strongest)
    total *= (1 + (startingPitcherMatchup - 0.5) * 0.2);

    // Adjust for bullpen strength (0-1 scale, 1 being strongest)
    total *= (1 + (bullpenStrength - 0.5) * 0.15);

    // Adjust for lineup strength and platoon advantages
    total *= (1 + (lineupStrength - 0.5) * 0.1);
    total *= (1 + (platoonAdvantage - 0.5) * 0.1);

    // Adjust for situational hitting (0-1 scale, 1 being strongest)
    total *= (1 + (situationalHitting - 0.5) * 0.1);

    return Math.round(total * 10) / 10; // Round to 1 decimal place
  }

  private calculateTotalConfidence(
    expectedTotal: number,
    line: number,
    startingPitcherMatchup: number,
    bullpenStrength: number,
    parkFactor: number
  ): number {
    // Base confidence starts at 0.55
    let confidence = 0.55;

    // Adjust based on how far our expected total is from the line
    const difference = Math.abs(expectedTotal - line);
    if (difference > 2) {
      confidence += 0.15; // Strong difference
    } else if (difference > 1) {
      confidence += 0.10; // Moderate difference
    } else if (difference > 0.5) {
      confidence += 0.05; // Small difference
    }

    // Adjust based on starting pitcher matchup strength
    if (startingPitcherMatchup > 0.7) {
      confidence += 0.10; // Strong pitcher matchup
    } else if (startingPitcherMatchup < 0.3) {
      confidence -= 0.05; // Weak pitcher matchup
    }

    // Adjust based on bullpen strength
    if (bullpenStrength > 0.7) {
      confidence += 0.05; // Strong bullpen
    } else if (bullpenStrength < 0.3) {
      confidence -= 0.05; // Weak bullpen
    }

    // Adjust based on park factor
    if (Math.abs(parkFactor - 1.0) > 0.1) {
      confidence += 0.05; // Significant park factor
    }

    // Cap confidence between 0.55 and 0.85
    return Math.min(0.85, Math.max(0.55, confidence));
  }

  private generateTotalReasoning(
    expectedTotal: number,
    line: number,
    direction: 'OVER' | 'UNDER',
    factors: PredictionFactors,
    game: Game
  ): string {
    const reasons = [];

    // Add expected total vs line comparison
    reasons.push(`Expected total of ${expectedTotal.toFixed(1)} runs vs line of ${line}`);

    // Add park factor impact
    if (factors.parkFactor > 1.1) {
      reasons.push('Strong hitter-friendly park factor');
    } else if (factors.parkFactor < 0.9) {
      reasons.push('Strong pitcher-friendly park factor');
    }

    // Add pitcher matchup impact
    if (factors.startingPitcherMatchup > 0.7) {
      reasons.push('Strong starting pitcher matchup');
    } else if (factors.startingPitcherMatchup < 0.3) {
      reasons.push('Weak starting pitcher matchup');
    }

    // Add bullpen impact
    if (factors.bullpenStrength > 0.7) {
      reasons.push('Strong bullpen advantage');
    } else if (factors.bullpenStrength < 0.3) {
      reasons.push('Weak bullpen disadvantage');
    }

    // Add lineup strength
    if (factors.lineupStrength > 0.7) {
      reasons.push('Strong offensive lineup');
    } else if (factors.lineupStrength < 0.3) {
      reasons.push('Weak offensive lineup');
    }

    // Add situational hitting
    if (factors.situationalHitting > 0.7) {
      reasons.push('Strong situational hitting metrics');
    } else if (factors.situationalHitting < 0.3) {
      reasons.push('Weak situational hitting metrics');
    }

    return reasons.join('\n• ');
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