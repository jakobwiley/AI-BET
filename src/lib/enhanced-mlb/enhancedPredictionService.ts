import { PrismaClient, Game, Prediction, PredictionOutcome, PredictionType } from '@prisma/client';
import type { PredictionType as PredictionTypeType } from '../../models/types.js';
import { MLBStatsService } from '../mlbStatsApi.js';
import { CacheService } from '../cacheService.js';
import { EnsembleModel } from './ensembleModel.js';
import { prisma } from '../../lib/prisma.js';
import { PredictorModel, EnhancedFactors } from '../enhanced-predictions/predictorModel.js';

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

  // Weather Factors
  weather?: {
    windSpeed: number;
    temperature: number;
  };

  // New factors
  headToHead?: number;
  scoringDifferential?: number;
  pitchingStrength?: number;
  keyPlayerImpact?: number;
}

interface ExtendedGame extends Game {
  weather?: {
    windSpeed: number;
    temperature: number;
  };
}

interface ExtendedPrediction extends Omit<Prediction, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
  grade: string;
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
  public async generatePrediction(game: ExtendedGame): Promise<Prediction> {
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

      // Parse odds from oddsJson
      let odds: any = {};
      if (game.oddsJson) {
        odds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
      }
      const moneyline = odds.moneyline && odds.moneyline.homeOdds !== undefined && odds.moneyline.awayOdds !== undefined
        ? { home: Number(odds.moneyline.homeOdds), away: Number(odds.moneyline.awayOdds) }
        : { home: 0, away: 0 };
      const runline = odds.spread && odds.spread.homeSpread !== undefined && odds.spread.awaySpread !== undefined
        ? { home: Number(odds.spread.homeSpread), away: Number(odds.spread.awaySpread) }
        : { home: 0, away: 0 };
      const total = odds.total && odds.total.overUnder !== undefined ? Number(odds.total.overUnder) : 0;

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

      // Ensure all predictions have grade property
      const predictionsWithGrade: Prediction[] = predictions.map(pred => ({
        ...pred,
        grade: pred.grade ?? 'C'
      }));

      // Use ensemble model to combine predictions
      const ensemblePredictionRaw = await this.ensembleModel.generatePrediction(game as any, predictionsWithGrade);
      // Ensure ensemble prediction has grade property
      const ensemblePrediction: Prediction = {
        ...ensemblePredictionRaw,
        grade: ensemblePredictionRaw.grade ?? 'C'
      };

      // Add detailed reasoning
      ensemblePrediction.reasoning = this.generateDetailedReasoning(factors, predictionsWithGrade);

      return {
        id: ensemblePrediction.id,
        gameId: ensemblePrediction.gameId,
        predictionType: ensemblePrediction.predictionType,
        predictionValue: ensemblePrediction.predictionValue,
        confidence: ensemblePrediction.confidence,
        reasoning: ensemblePrediction.reasoning,
        outcome: ensemblePrediction.outcome,
        grade: ensemblePrediction.grade,
        createdAt: new Date(ensemblePrediction.createdAt),
        updatedAt: new Date(ensemblePrediction.updatedAt),
        projectionJson: ensemblePrediction.projectionJson ?? null
      };
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
    game: ExtendedGame,
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
    // Recent form
    const recentForm = this.calculateRecentForm(homeTeamStats, awayTeamStats);
    // Rest days
    const restDays = this.calculateRestDaysImpact(game);
    // Pitching factors
    const startingPitcherMatchup = await this.analyzePitcherMatchup(
      homePitcher,
      awayPitcher,
      homeTeamStats,
      awayTeamStats
    );
    const bullpenStrength = this.analyzeBullpenStrength(homeTeamStats, awayTeamStats);
    // Lineup/batting factors (now uses advanced hitter stats)
    const lineupStrength = await this.analyzeLineupStrength(game);
    const platoonAdvantage = this.calculatePlatoonAdvantage(
      homePitcher,
      awayPitcher,
      homeTeamStats,
      awayTeamStats
    );
    const situationalHitting = this.analyzeSituationalHitting(homeTeamStats, awayTeamStats);
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
      lineupStrength, // Now based on advanced hitter stats
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
    // Convert factors to the EnhancedFactors format
    const enhancedFactors: EnhancedFactors = {
      overallRecordFactor: factors.teamStrength,
      homeAwaySplitFactor: factors.homeAdvantage,
      recentFormFactor: factors.recentForm,
      headToHeadFactor: factors.headToHead || 0.5,
      scoringDiffFactor: factors.scoringDifferential || 0.5,
      pitcherMatchupFactor: factors.startingPitcherMatchup,
      teamPitchingFactor: factors.bullpenStrength,
      batterHandednessFactor: factors.platoonAdvantage,
      ballparkFactor: factors.parkFactor,
      battingStrengthFactor: factors.lineupStrength,
      pitchingStrengthFactor: factors.pitchingStrength || 0.5,
      keyPlayerImpactFactor: factors.keyPlayerImpact || 0.5,
      restFactor: factors.restDays || 0.5,
      lineupSplitStrengthFactor: factors.lineupSplitStrength || 0.5,
      recentFormStrengthFactor: factors.recentFormStrength || 0.5
    };

    // Use the PredictorModel's formatReasoning method to generate structured JSON
    return PredictorModel.formatReasoning(enhancedFactors);
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

  private calculateRestDaysImpact(game: ExtendedGame): number {
    // Implementation using rest days data
    return 0.5; // Placeholder
  }

  private async analyzeLineupStrength(game: ExtendedGame): Promise<number> {
    // Use advanced hitter stats for both lineups if available
    const homeStatsArr = (game as any).homeLineupStats || [];
    const awayStatsArr = (game as any).awayLineupStats || [];
    const homeSplitsArr = (game as any).homeLineupSplits || [];
    const awaySplitsArr = (game as any).awayLineupSplits || [];

    // Helper for average
    function avg(arr: any[], key: string) {
      const vals = arr.map(p => typeof p?.[key] === 'number' ? p[key] : Number(p?.[key])).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.32;
    }

    // --- Aggregate advanced stats ---
    const homeWoba = avg(homeStatsArr, 'wOBA');
    const awayWoba = avg(awayStatsArr, 'wOBA');
    const homeWrc = avg(homeStatsArr, 'wRC+');
    const awayWrc = avg(awayStatsArr, 'wRC+');

    // --- Aggregate splits: vsLHP, vsRHP ---
    function splitAvg(arr: any[], split: string, stat: string) {
      const vals = arr.map(p => p && p.splits && p.splits[split] && typeof p.splits[split][stat] === 'number'
        ? p.splits[split][stat] : Number(p?.splits?.[split]?.[stat])).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    // Use vsRHP for away (facing home RHP) and vsLHP for home (facing away LHP) as example; can be expanded
    const homeVsRhpAvg = splitAvg(homeSplitsArr, 'vsRHP', 'AVG');
    const awayVsLhpAvg = splitAvg(awaySplitsArr, 'vsLHP', 'AVG');
    // --- Aggregate recent streaks (last14) ---
    function streakAvg(arr: any[], window: string, stat: string) {
      const vals = arr.map(p => p && p.streaks && p.streaks[window] && typeof p.streaks[window][stat] === 'number'
        ? p.streaks[window][stat] : Number(p?.streaks?.[window]?.[stat])).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    const homeRecentAvg = streakAvg(homeSplitsArr, 'last14', 'AVG');
    const awayRecentAvg = streakAvg(awaySplitsArr, 'last14', 'AVG');

    // --- Blend all factors (wOBA, wRC+, splits, streaks) ---
    // Weights: 40% advanced stats, 30% splits, 30% recent
    const homeScore = (homeWoba * 0.5 + (homeWrc / 100) * 0.2) * 0.4 + homeVsRhpAvg * 0.3 + homeRecentAvg * 0.3;
    const awayScore = (awayWoba * 0.5 + (awayWrc / 100) * 0.2) * 0.4 + awayVsLhpAvg * 0.3 + awayRecentAvg * 0.3;
    // Normalize
    const norm = (homeScore - awayScore + 0.3) / 0.6;
    return Math.max(0, Math.min(1, norm));
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
    game: ExtendedGame,
    factors: PredictionFactors
  ): Promise<Prediction> {
    // Convert factors to the EnhancedFactors format
    const enhancedFactors: EnhancedFactors = {
      overallRecordFactor: factors.teamStrength,
      homeAwaySplitFactor: factors.homeAdvantage,
      recentFormFactor: factors.recentForm,
      headToHeadFactor: factors.headToHead || 0.5,
      scoringDiffFactor: factors.scoringDifferential || 0.5,
      pitcherMatchupFactor: factors.startingPitcherMatchup,
      teamPitchingFactor: factors.bullpenStrength,
      batterHandednessFactor: factors.platoonAdvantage,
      ballparkFactor: factors.parkFactor,
      battingStrengthFactor: factors.lineupStrength,
      pitchingStrengthFactor: factors.pitchingStrength || 0.5,
      keyPlayerImpactFactor: factors.keyPlayerImpact || 0.5,
      restFactor: factors.restDays || 0.5
    };

    return {
      id: `${game.id}-moneyline`,
      gameId: game.id,
      predictionType: PredictionType.MONEYLINE,
      predictionValue: factors.winProbability > 0.5 ? 'HOME' : 'AWAY',
      confidence: Math.round(factors.winProbability * 100),
      reasoning: PredictorModel.formatReasoning(enhancedFactors),
      outcome: PredictionOutcome.PENDING,
      grade: 'C',
      createdAt: new Date(),
      updatedAt: new Date(),
      projectionJson: null
    };
  }

  private async generateRunLinePrediction(
    game: ExtendedGame,
    factors: PredictionFactors
  ): Promise<Prediction> {
    // Convert factors to the EnhancedFactors format
    const enhancedFactors: EnhancedFactors = {
      overallRecordFactor: factors.teamStrength,
      homeAwaySplitFactor: factors.homeAdvantage,
      recentFormFactor: factors.recentForm,
      headToHeadFactor: factors.headToHead || 0.5,
      scoringDiffFactor: factors.scoringDifferential || 0.5,
      pitcherMatchupFactor: factors.startingPitcherMatchup,
      teamPitchingFactor: factors.bullpenStrength,
      batterHandednessFactor: factors.platoonAdvantage,
      ballparkFactor: factors.parkFactor,
      battingStrengthFactor: factors.lineupStrength,
      pitchingStrengthFactor: factors.pitchingStrength || 0.5,
      keyPlayerImpactFactor: factors.keyPlayerImpact || 0.5,
      restFactor: factors.restDays || 0.5
    };

    return {
      id: `${game.id}-runline`,
      gameId: game.id,
      predictionType: PredictionType.SPREAD,
      predictionValue: factors.winProbability > 0.5 ? 'HOME' : 'AWAY',
      confidence: Math.round(factors.winProbability * 100),
      reasoning: PredictorModel.formatReasoning(enhancedFactors),
      outcome: PredictionOutcome.PENDING,
      grade: 'C',
      createdAt: new Date(),
      updatedAt: new Date(),
      projectionJson: null
    };
  }

  private async generateTotalPrediction(
    game: ExtendedGame,
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

    // Convert factors to the EnhancedFactors format
    const enhancedFactors: EnhancedFactors = {
      overallRecordFactor: factors.teamStrength,
      homeAwaySplitFactor: factors.homeAdvantage,
      recentFormFactor: factors.recentForm,
      headToHeadFactor: factors.headToHead || 0.5,
      scoringDiffFactor: factors.scoringDifferential || 0.5,
      pitcherMatchupFactor: factors.startingPitcherMatchup,
      teamPitchingFactor: factors.bullpenStrength,
      batterHandednessFactor: factors.platoonAdvantage,
      ballparkFactor: factors.parkFactor,
      battingStrengthFactor: factors.lineupStrength,
      pitchingStrengthFactor: factors.pitchingStrength || 0.5,
      keyPlayerImpactFactor: factors.keyPlayerImpact || 0.5,
      restFactor: factors.restDays || 0.5
    };

    return {
      id: `${game.id}-total`,
      gameId: game.id,
      predictionType: PredictionType.TOTAL,
      predictionValue: `${direction.charAt(0).toLowerCase()}${total}`,
      confidence,
      reasoning: PredictorModel.formatReasoning(enhancedFactors),
      outcome: PredictionOutcome.PENDING,
      grade: 'C',
      createdAt: new Date(),
      updatedAt: new Date(),
      projectionJson: null
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

  private async logFactorContributions(
    game: ExtendedGame,
    factors: PredictionFactors,
    prediction: Prediction,
    outcome: PredictionOutcome
  ): Promise<void> {
    try {
      // Convert factors to a plain object for JSON storage
      const factorData = {
        teamStrength: factors.teamStrength,
        homeAdvantage: factors.homeAdvantage,
        recentForm: factors.recentForm,
        startingPitcherMatchup: factors.startingPitcherMatchup,
        bullpenStrength: factors.bullpenStrength,
        lineupStrength: factors.lineupStrength,
        platoonAdvantage: factors.platoonAdvantage,
        situationalHitting: factors.situationalHitting,
        expectedRuns: factors.expectedRuns,
        winProbability: factors.winProbability,
        valueRating: factors.valueRating,
        headToHead: factors.headToHead,
        scoringDifferential: factors.scoringDifferential,
        pitchingStrength: factors.pitchingStrength,
        keyPlayerImpact: factors.keyPlayerImpact,
        restDays: factors.restDays
      };

      await prisma.prediction.update({
        where: { id: prediction.id },
        data: {
          outcome,
          projectionJson: factorData
        }
      });
    } catch (error) {
      console.error('Error logging factor contributions:', error);
    }
  }

  private async validateSpreadPrediction(
    game: ExtendedGame,
    prediction: Prediction,
    factors: PredictionFactors
  ): Promise<{ isValid: boolean; confidenceAdjustment: number }> {
    const value = prediction.predictionValue.trim();
    let spreadValue: number | null = null;
    let isHomeTeam = true;

    // Parse spread value
    if (/^[+-]?\d+(\.\d+)?$/.test(value)) {
      spreadValue = parseFloat(value);
      isHomeTeam = spreadValue < 0;
    } else {
      const match = value.match(/^[+-](.+?)\s+([+-]?\d+(\.\d+)?)/);
      if (match) {
        const team = match[1].trim();
        spreadValue = parseFloat(match[2]);
        isHomeTeam = team === game.homeTeamName;
      }
    }

    if (spreadValue === null) {
      return { isValid: false, confidenceAdjustment: 0.7 };
    }

    const absSpread = Math.abs(spreadValue);

    // More aggressive confidence reduction for large spreads
    if (absSpread > 2.0) {
      const confidenceAdj = Math.max(0.6, 1 - ((absSpread - 2.0) * 0.15));
      return { 
        isValid: true, 
        confidenceAdjustment: confidenceAdj
      };
    }

    // Additional validation for extreme weather conditions
    if (game.weather?.windSpeed > 15 || game.weather?.temperature > 90) {
      return {
        isValid: true,
        confidenceAdjustment: 0.8
      };
    }

    // Validate against historical performance
    const historicalAccuracy = await this.getHistoricalAccuracy(game.homeTeamName, game.awayTeamName);
    if (historicalAccuracy < 0.5) {
      return {
        isValid: true,
        confidenceAdjustment: 0.85
      };
    }

    // Log factor contributions after validation
    if (game.status === 'FINAL') {
      const outcome = this.determinePredictionOutcome(prediction, game);
      await this.logFactorContributions(game, factors, prediction, outcome);
    }

    return { isValid: true, confidenceAdjustment: 1.0 };
  }

  /**
   * Update prediction outcomes based on game results
   */
  private async updatePredictionOutcomes(game: ExtendedGame): Promise<void> {
    if (game.status !== 'FINAL' || game.homeScore == null || game.awayScore == null) {
      return;
    }

    const predictions = await prisma.prediction.findMany({
      where: { gameId: game.id }
    });

    for (const prediction of predictions) {
      const outcome = this.determinePredictionOutcome(prediction, game);
      if (outcome) {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { 
            outcome
          }
        });
      }
    }
  }

  /**
   * Determine the outcome of a prediction based on game results
   */
  private determinePredictionOutcome(prediction: Prediction, game: ExtendedGame): PredictionOutcome | null {
    if (game.homeScore == null || game.awayScore == null) {
      return null;
    }

    const homeScore = game.homeScore;
    const awayScore = game.awayScore;
    const homeWon = homeScore > awayScore;
    const awayWon = awayScore > homeScore;
    const isPush = homeScore === awayScore;

    switch (prediction.predictionType) {
      case 'MONEYLINE':
        if (isPush) return 'PUSH';
        return prediction.predictionValue === 'HOME' ? (homeWon ? 'WIN' : 'LOSS') : (awayWon ? 'WIN' : 'LOSS');
      
      case 'SPREAD':
        const spread = parseFloat(prediction.predictionValue);
        if (isNaN(spread)) return null;
        
        const homeWithSpread = homeScore + spread;
        if (homeWithSpread === awayScore) return 'PUSH';
        return homeWithSpread > awayScore ? 'WIN' : 'LOSS';
      
      case 'TOTAL':
        const total = parseFloat(prediction.predictionValue.slice(1));
        if (isNaN(total)) return null;
        
        const actualTotal = homeScore + awayScore;
        if (actualTotal === total) return 'PUSH';
        return prediction.predictionValue.startsWith('o') ? 
          (actualTotal > total ? 'WIN' : 'LOSS') : 
          (actualTotal < total ? 'WIN' : 'LOSS');
      
      default:
        return null;
    }
  }

  private async getHistoricalAccuracy(homeTeam: string, awayTeam: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamName: homeTeam },
          { awayTeamName: homeTeam },
          { homeTeamName: awayTeam },
          { awayTeamName: awayTeam }
        ],
        gameDate: {
          gte: thirtyDaysAgo
        },
        status: 'FINAL'
      },
      include: {
        predictions: {
          where: {
            predictionType: 'SPREAD'
          }
        }
      }
    });

    let correctPredictions = 0;
    let totalPredictions = 0;

    for (const game of games) {
      for (const prediction of game.predictions) {
        if (prediction.outcome === 'WIN') {
          correctPredictions++;
        }
        totalPredictions++;
      }
    }

    return totalPredictions > 0 ? correctPredictions / totalPredictions : 0.5;
  }

  /**
   * Documentation: Required data for world-class MLB prediction
   * - Game: id, homeTeamId, awayTeamId, homeTeamName, awayTeamName, odds (moneyline, spread, total), probableHomePitcherId, probableAwayPitcherId
   * - TeamStats: full team stats for both teams
   * - PitcherStats: for both probable pitchers
   * - Advanced analytics: park factors (by homeTeamName), situational stats, bullpen usage, batter-pitcher matchups
   */
} 