import { Game, PredictionType, SportType, Prediction } from '../../models/types.js';
import { TeamStats, H2HStats } from '../predictionService.js';
import { PredictorModel, EnhancedFactors } from './predictorModel.js';
import { ApiManager } from '../apiManager.js';
import { MLBStatsService, PitcherDetails, PitcherStats } from '../mlbStatsApi.js';
import { PredictionService } from '../predictionService.js';

// Mapping of MLB teams to their ballpark factors for display in reasoning
const MLB_PARK_FACTORS: Record<string, number> = {
  'Colorado Rockies': 1.15,      // Coors Field
  'Cincinnati Reds': 1.08,       // Great American Ball Park
  'Boston Red Sox': 1.07,        // Fenway Park
  'Philadelphia Phillies': 1.05, // Citizens Bank Park
  'Texas Rangers': 1.04,         // Globe Life Field
  'Baltimore Orioles': 1.03,     // Camden Yards
  'Chicago Cubs': 1.03,          // Wrigley Field
  
  // Pitcher-friendly parks
  'San Francisco Giants': 0.92,  // Oracle Park
  'Miami Marlins': 0.93,         // loanDepot Park
  'Oakland Athletics': 0.94,     // Oakland Coliseum
  'St. Louis Cardinals': 0.95,   // Busch Stadium
  'Seattle Mariners': 0.95       // T-Mobile Park
};

export class EnhancedAnalyzer {
  /**
   * Generate advanced predictions for a game using the enhanced prediction model
   */
  public static async generatePredictions(game: Game): Promise<Prediction[]> {
    console.log(`[EnhancedAnalyzer] Generating advanced predictions for game: ${game.id}`);
    
    try {
      // Use ApiManager to fetch team stats with provider abstraction
      const apiManager = ApiManager.getInstance();
      
      // Fetch team stats
      const [homeStats, awayStats, h2hStats] = await Promise.all([
          apiManager.getTeamStats(game.sport, game.homeTeamName),
          apiManager.getTeamStats(game.sport, game.awayTeamName),
          apiManager.getH2HStats(game.sport, game.homeTeamName, game.awayTeamName)
      ]);

      // Get predictions from PredictionService
      return await PredictionService.getPredictionsForGame(game, homeStats, awayStats, h2hStats);
    } catch (error) {
      console.error(`[EnhancedAnalyzer] Error generating predictions for game ${game.id}:`, error);
      return [];
    }
  }
  
  /**
   * Generate a single prediction for a specific type (spread, moneyline, total)
   */
  private static generatePrediction(
    game: Game,
    stats: any,
    predictionType: PredictionType,
    predictionValue: string
  ): { prediction: string; confidence: number; reasoning: string } {
    const predictionValueNum = parseFloat(predictionValue);
    const confidence = this.calculateConfidence(game, stats, predictionType, predictionValueNum);
    const reasoning = this.generateReasoning(game, stats, predictionType, predictionValueNum);

    return {
      prediction: predictionValue,
      confidence,
      reasoning
    };
  }
  
  /**
   * Calculate grade based on confidence score
   */
  private static calculateGrade(confidence: number): string {
    if (confidence >= 80) return 'A';
    if (confidence >= 70) return 'B';
    if (confidence >= 60) return 'C';
    if (confidence >= 50) return 'D';
    return 'F';
  }
  
  /**
   * Calculate enhanced factors based on advanced stats
   */
  private static calculateEnhancedFactors(game: Game, stats: any): EnhancedFactors {
    const factors: EnhancedFactors = {
      overallRecordFactor: 0.5,
      homeAwaySplitFactor: 0.5,
      recentFormFactor: 0.5,
      headToHeadFactor: 0.5,
      scoringDiffFactor: 0.5,
      pitcherMatchupFactor: 0.5,
      netRatingFactor: 0.5
    };

    // Add sport-specific factors
    if (game.sport === 'NBA') {
      factors.paceFactor = 0.5;
      factors.offensiveEfficiencyFactor = 0.5;
      factors.defensiveEfficiencyFactor = 0.5;
    } else if (game.sport === 'MLB') {
      factors.teamPitchingFactor = 0.5;
      factors.batterHandednessFactor = 0.5;
      factors.ballparkFactor = 0.5;
    }

    return factors;
  }
  
  /**
   * Calculate confidence score based on factors
   */
  private static calculateConfidence(
    game: Game,
    stats: any,
    predictionType: PredictionType,
    predictionValue: number
  ): number {
    const factors = this.calculateEnhancedFactors(game, stats);
    let baseConfidence = 0.5;

    switch (predictionType) {
      case 'SPREAD':
        if (Math.abs(predictionValue) > 10) {
          baseConfidence -= 0.1;
        }
        if (factors.homeAwaySplitFactor > 0.6) {
          baseConfidence += 0.05;
        }
        break;
      case 'TOTAL':
        if (predictionValue > 220) {
          baseConfidence -= 0.1;
        }
        if (factors.scoringDiffFactor > 0.6) {
          baseConfidence += 0.05;
        }
        break;
      case 'MONEYLINE':
        if (factors.homeAwaySplitFactor > 0.6) {
          baseConfidence += 0.05;
        }
        if (factors.recentFormFactor > 0.6) {
          baseConfidence += 0.05;
        }
        break;
    }

    return Math.min(Math.max(baseConfidence, 0.1), 0.95);
  }
  
  /**
   * Generate reasoning for the prediction
   */
  private static generateReasoning(
    game: Game,
    stats: any,
    predictionType: PredictionType,
    predictionValue: number
  ): string {
    const factors = this.calculateEnhancedFactors(game, stats);
    let reasoning = '';

    switch (predictionType) {
      case 'SPREAD':
        if (Math.abs(predictionValue) > 10) {
          reasoning += 'Large spread indicates significant team strength difference. ';
        }
        if (factors.homeAwaySplitFactor > 0.6) {
          reasoning += 'Strong home court advantage. ';
        }
        break;
      case 'TOTAL':
        if (predictionValue > 220) {
          reasoning += 'High total suggests offensive matchup. ';
        }
        if (factors.scoringDiffFactor > 0.6) {
          reasoning += 'Recent games show high scoring trend. ';
        }
        break;
      case 'MONEYLINE':
        if (factors.homeAwaySplitFactor > 0.6) {
          reasoning += 'Home team has strong advantage. ';
        }
        if (factors.recentFormFactor > 0.6) {
          reasoning += 'Team showing strong recent form. ';
        }
        break;
    }

    return reasoning.trim();
  }
}