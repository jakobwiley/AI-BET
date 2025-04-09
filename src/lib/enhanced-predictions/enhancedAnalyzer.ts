import { Game, PredictionType, SportType, Prediction } from '../../models/types';
import { TeamStats, H2HStats } from '../predictionService';
import { PredictorModel, EnhancedFactors } from './predictorModel';
import { ApiManager } from '../apiManager';
import { MLBStatsService, PitcherDetails, PitcherStats } from '../mlbStatsApi';
import { PredictionService } from '../predictionService';

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
    predictionType: PredictionType, 
    enhancedFactors: EnhancedFactors
  ): Prediction | null {
    // Calculate confidence based on factors
    const confidence = PredictorModel.calculateConfidence(
      game.sport, 
      predictionType,
      enhancedFactors
    );
    
    // Determine the actual prediction value based on type
    const { value, formattedValue } = this.determinePredictionValue(
      game,
      predictionType,
      enhancedFactors,
      confidence
    );
    
    if (value === null) {
      console.warn(`[EnhancedAnalyzer] Could not determine prediction value for ${predictionType}`);
      return null;
    }
    
    // Generate reasoning
    const reasoning = this.generateReasoning(
      game,
      predictionType,
      enhancedFactors,
      formattedValue,
      confidence
    );
    
    // Format the prediction object
    return {
      id: `${game.id}-${predictionType}-enhanced`,
      gameId: game.id,
      predictionType: predictionType,
      predictionValue: value,
      confidence: confidence,
      grade: this.calculateGrade(confidence),
      reasoning: reasoning,
      createdAt: new Date().toISOString()
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
    // This method should delegate to PredictorModel
    return PredictorModel.calculateEnhancedFactors(
      game.sport,
      stats?.homeStats,
      stats?.awayStats,
      stats?.h2hStats,
      game
    );
  }
  
  /**
   * Calculate confidence score based on factors
   */
  private static calculateConfidence(
    game: Game, 
    predictionType: PredictionType, 
    enhancedFactors: EnhancedFactors
  ): number {
    // This method should delegate to PredictorModel
    return PredictorModel.calculateConfidence(
      game.sport,
      predictionType,
      enhancedFactors
    );
  }
  
  /**
   * Determine the prediction value based on type and factors
   */
  private static determinePredictionValue(
    game: Game,
    predictionType: PredictionType,
    enhancedFactors: EnhancedFactors,
    confidence: number
  ): { value: number | null, formattedValue: string } {
    // Base decision on normalized confidence (0-1 scale where 0.5 is neutral)
    const normalizedConfidence = confidence / 100;
    const favorHome = normalizedConfidence > 0.5;
    
    switch (predictionType) {
      case 'SPREAD':
        if (!game.odds?.spread?.homeSpread) {
          return { value: null, formattedValue: 'N/A' };
        }
        
        const spread = game.odds.spread.homeSpread;
        const spreadOdds = favorHome ? game.odds.spread.homeOdds : game.odds.spread.awayOdds;
        const formattedSpread = favorHome ? `${game.homeTeamName} ${spread > 0 ? '+' : ''}${spread}` : `${game.awayTeamName} ${-spread > 0 ? '+' : ''}${-spread}`;
        
        return { 
          value: spread, 
          formattedValue: `${formattedSpread} (${spreadOdds > 0 ? '+' : ''}${spreadOdds})` 
        };
        
      case 'MONEYLINE':
        if (!game.odds?.moneyline?.homeOdds || !game.odds?.moneyline?.awayOdds) {
          return { value: null, formattedValue: 'N/A' };
        }
        
        const mlOdds = favorHome ? game.odds.moneyline.homeOdds : game.odds.moneyline.awayOdds;
        
        return { 
          value: mlOdds, 
          formattedValue: `${favorHome ? game.homeTeamName : game.awayTeamName} ${mlOdds > 0 ? '+' : ''}${mlOdds}` 
        };
        
      case 'TOTAL':
        if (!game.odds?.total?.overUnder || !game.odds?.total?.overOdds || !game.odds?.total?.underOdds) {
          return { value: null, formattedValue: 'N/A' };
        }
        
        const line = game.odds.total.overUnder;
        const totalLeanFactor = this.calculateTotalFactor(game, enhancedFactors);
        const overOrUnder = totalLeanFactor > 0 ? 'Over' : 'Under';
        const totalOdds = totalLeanFactor > 0 ? game.odds.total.overOdds : game.odds.total.underOdds;
        
        return { 
          value: line, 
          formattedValue: `${overOrUnder} ${line} (${totalOdds > 0 ? '+' : ''}${totalOdds})` 
        };
        
      default:
        return { value: null, formattedValue: 'N/A' };
    }
  }
  
  /**
   * Calculate special factor for totals predictions
   */
  private static calculateTotalFactor(game: Game, enhancedFactors: EnhancedFactors): number {
    let factor = 0;
    
    // Use scoring differential factor
    factor += enhancedFactors.scoringDiffFactor;
    
    // Add sport-specific factors
    if (game.sport === 'NBA') {
      // For NBA, consider pace and efficiency
      if (enhancedFactors.paceFactor) factor += enhancedFactors.paceFactor * 0.3;
      if (enhancedFactors.offensiveEfficiencyFactor) factor += enhancedFactors.offensiveEfficiencyFactor * 0.4;
      if (enhancedFactors.defensiveEfficiencyFactor) factor += enhancedFactors.defensiveEfficiencyFactor * 0.3;
    } else if (game.sport === 'MLB') {
      // For MLB, consider team pitching and batter handedness
      if (enhancedFactors.teamPitchingFactor) factor += enhancedFactors.teamPitchingFactor * 0.4;
      if (enhancedFactors.batterHandednessFactor) factor += enhancedFactors.batterHandednessFactor * 0.3;
      if (enhancedFactors.ballparkFactor) factor += enhancedFactors.ballparkFactor * 0.3;
    }
    
    return factor;
  }
  
  /**
   * Generate reasoning for the prediction
   */
  private static generateReasoning(
    game: Game,
    predictionType: PredictionType,
    enhancedFactors: EnhancedFactors,
    predictionValue: string,
    confidence: number
  ): string {
    let reasoning = '';
    
    // Add base factors reasoning
    reasoning += `Based on overall records (${(enhancedFactors.overallRecordFactor * 100).toFixed(1)}% confidence), `;
    reasoning += `home/away performance (${(enhancedFactors.homeAwaySplitFactor * 100).toFixed(1)}% confidence), `;
    reasoning += `and recent form (${(enhancedFactors.recentFormFactor * 100).toFixed(1)}% confidence). `;
    
    // Add sport-specific reasoning
    if (game.sport === 'NBA') {
      if (enhancedFactors.paceFactor) {
        reasoning += `Game pace analysis (${(enhancedFactors.paceFactor * 100).toFixed(1)}% confidence) `;
      }
      if (enhancedFactors.offensiveEfficiencyFactor) {
        reasoning += `and offensive efficiency (${(enhancedFactors.offensiveEfficiencyFactor * 100).toFixed(1)}% confidence) `;
      }
      if (enhancedFactors.defensiveEfficiencyFactor) {
        reasoning += `with defensive efficiency (${(enhancedFactors.defensiveEfficiencyFactor * 100).toFixed(1)}% confidence) `;
      }
    } else if (game.sport === 'MLB') {
      if (enhancedFactors.teamPitchingFactor) {
        reasoning += `Team pitching comparison (${(enhancedFactors.teamPitchingFactor * 100).toFixed(1)}% confidence) `;
      }
      if (enhancedFactors.batterHandednessFactor) {
        reasoning += `and batter matchups (${(enhancedFactors.batterHandednessFactor * 100).toFixed(1)}% confidence) `;
      }
      if (enhancedFactors.ballparkFactor) {
        reasoning += `with ballpark factors (${(enhancedFactors.ballparkFactor * 100).toFixed(1)}% confidence) `;
      }
    }
    
    // Add final confidence statement
    reasoning += `\n\nOverall confidence: ${confidence}% (Grade: ${this.calculateGrade(confidence)})`;
    
    return reasoning;
  }
}