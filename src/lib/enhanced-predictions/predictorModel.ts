import { Game, PredictionType, SportType, Prediction } from '../../models/types';
import { TeamStats, H2HStats } from '../predictionService';

export interface EnhancedFactors {
  // Base factors
  overallRecordFactor: number;
  homeAwaySplitFactor: number;
  recentFormFactor: number;
  headToHeadFactor: number;
  scoringDiffFactor: number;
  
  // Sport-specific factors
  // NBA
  paceFactor?: number;
  offensiveEfficiencyFactor?: number;
  defensiveEfficiencyFactor?: number;
  netRatingFactor?: number;
  
  // MLB
  pitcherMatchupFactor?: number;
  teamPitchingFactor?: number;
  batterHandednessFactor?: number;
  ballparkFactor?: number;
}

interface ModelWeights {
  [key: string]: { [key in PredictionType]: number };
}

// Enhanced prediction model with advanced analytics
export class PredictorModel {
  // Weights trained on historical data
  private static readonly NBA_WEIGHTS: ModelWeights = {
    'overallRecordFactor': { 'SPREAD': 0.12, 'MONEYLINE': 0.18, 'TOTAL': 0.05 },
    'homeAwaySplitFactor': { 'SPREAD': 0.18, 'MONEYLINE': 0.22, 'TOTAL': 0.08 },
    'recentFormFactor': { 'SPREAD': 0.20, 'MONEYLINE': 0.25, 'TOTAL': 0.10 },
    'headToHeadFactor': { 'SPREAD': 0.05, 'MONEYLINE': 0.10, 'TOTAL': 0.02 },
    'scoringDiffFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.05, 'TOTAL': 0.20 },
    'paceFactor': { 'SPREAD': 0.05, 'MONEYLINE': 0.03, 'TOTAL': 0.25 },
    'offensiveEfficiencyFactor': { 'SPREAD': 0.15, 'MONEYLINE': 0.10, 'TOTAL': 0.15 },
    'defensiveEfficiencyFactor': { 'SPREAD': 0.15, 'MONEYLINE': 0.07, 'TOTAL': 0.15 }
  };
  
  private static readonly MLB_WEIGHTS: ModelWeights = {
    'overallRecordFactor': { 'SPREAD': 0.08, 'MONEYLINE': 0.12, 'TOTAL': 0.05 },
    'homeAwaySplitFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.15, 'TOTAL': 0.05 },
    'recentFormFactor': { 'SPREAD': 0.12, 'MONEYLINE': 0.15, 'TOTAL': 0.05 },
    'headToHeadFactor': { 'SPREAD': 0.05, 'MONEYLINE': 0.08, 'TOTAL': 0.02 },
    'scoringDiffFactor': { 'SPREAD': 0.05, 'MONEYLINE': 0.05, 'TOTAL': 0.18 },
    'pitcherMatchupFactor': { 'SPREAD': 0.25, 'MONEYLINE': 0.20, 'TOTAL': 0.25 },
    'teamPitchingFactor': { 'SPREAD': 0.15, 'MONEYLINE': 0.10, 'TOTAL': 0.20 },
    'batterHandednessFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.08, 'TOTAL': 0.05 },
    'ballparkFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.07, 'TOTAL': 0.15 }
  };
  
  /**
   * Calculate enhanced prediction factors
   */
  public static calculateEnhancedFactors(
    sport: SportType,
    homeStats: TeamStats,
    awayStats: TeamStats,
    h2hStats: H2HStats | null,
    game: Game
  ): EnhancedFactors {
    // Calculate standard factors
    const homeWinPct = homeStats.wins / (homeStats.wins + homeStats.losses || 1);
    const awayWinPct = awayStats.wins / (awayStats.wins + awayStats.losses || 1);
    const homeHomeWinPct = homeStats.homeWins / (homeStats.homeWins + homeStats.homeLosses || 1);
    const awayAwayWinPct = awayStats.awayWins / (awayStats.awayWins + awayStats.awayLosses || 1);
    
    // Calculate normalized factors (0.5 means neutral, >0.5 favors home, <0.5 favors away)
    const overallRecordFactor = (homeWinPct - awayWinPct + 1) / 2;
    const homeAwaySplitFactor = (homeHomeWinPct - awayAwayWinPct + 1) / 2;
    
    // Recent form (last 10 games)
    const homeRecentWinPct = homeStats.lastTenWins / 10;
    const awayRecentWinPct = awayStats.lastTenWins / 10;
    const recentFormFactor = (homeRecentWinPct - awayRecentWinPct + 1) / 2;
    
    // Head-to-head factor
    let headToHeadFactor = 0.5; // Default to neutral
    if (h2hStats && h2hStats.totalGames > 0) {
      const h2hWinPct = h2hStats.homeTeamWins / h2hStats.totalGames;
      headToHeadFactor = h2hWinPct;
    }
    
    // Scoring differential factor
    let scoringDiffFactor = 0.5; // Default to neutral
    if (sport === 'NBA' && homeStats.avgPointsScored && homeStats.avgPointsAllowed && 
        awayStats.avgPointsScored && awayStats.avgPointsAllowed) {
      const homeNetRating = homeStats.avgPointsScored - homeStats.avgPointsAllowed;
      const awayNetRating = awayStats.avgPointsScored - awayStats.avgPointsAllowed;
      // Normalize to 0-1 range (assuming reasonable NBA scoring differences)
      scoringDiffFactor = ((homeNetRating - awayNetRating) / 20) + 0.5;
    } else if (sport === 'MLB' && homeStats.avgRunsScored && homeStats.avgRunsAllowed &&
               awayStats.avgRunsScored && awayStats.avgRunsAllowed) {
      const homeRunDiff = homeStats.avgRunsScored - homeStats.avgRunsAllowed;
      const awayRunDiff = awayStats.avgRunsScored - awayStats.avgRunsAllowed;
      // Normalize to 0-1 range (assuming reasonable MLB run differences)
      scoringDiffFactor = ((homeRunDiff - awayRunDiff) / 3) + 0.5;
    }
    
    // Base factors common to both sports
    const factors: EnhancedFactors = {
      overallRecordFactor,
      homeAwaySplitFactor,
      recentFormFactor,
      headToHeadFactor,
      scoringDiffFactor
    };
    
    // Add sport-specific factors
    if (sport === 'NBA') {
      // NBA specific factors
      const paceFactor = this.calculateNbaPaceFactor(homeStats, awayStats);
      const offensiveEfficiencyFactor = this.calculateNbaOffensiveEfficiencyFactor(homeStats, awayStats);
      const defensiveEfficiencyFactor = this.calculateNbaDefensiveEfficiencyFactor(homeStats, awayStats);
      const netRatingFactor = this.calculateNbaNetRatingFactor(homeStats, awayStats);
      
      return {
        ...factors,
        paceFactor,
        offensiveEfficiencyFactor,
        defensiveEfficiencyFactor,
        netRatingFactor
      };
    } else if (sport === 'MLB') {
      // MLB specific factors
      // These would need to be implemented with real data
      const pitcherMatchupFactor = 0.5; // Placeholder
      const teamPitchingFactor = this.calculateMlbTeamPitchingFactor(homeStats, awayStats);
      const batterHandednessFactor = 0.5; // Placeholder
      const ballparkFactor = this.calculateMlbBallparkFactor(game.homeTeamName);
      
      return {
        ...factors,
        pitcherMatchupFactor,
        teamPitchingFactor,
        batterHandednessFactor,
        ballparkFactor
      };
    }
    
    return factors;
  }
  
  /**
   * Calculate confidence score based on enhanced factors
   */
  public static calculateConfidence(
    sport: SportType, 
    predictionType: PredictionType,
    factors: EnhancedFactors
  ): number {
    const weights = sport === 'NBA' ? this.NBA_WEIGHTS : this.MLB_WEIGHTS;
    let confidence = 0.5; // Start at neutral
    let totalWeight = 0;
    
    // Apply weights for each factor
    for (const [factorName, factorValue] of Object.entries(factors)) {
      if (factorValue !== undefined && weights[factorName] && weights[factorName][predictionType]) {
        const weight = weights[factorName][predictionType];
        // Normalized factor value (0.5 is neutral, 0-1 range)
        confidence += (factorValue - 0.5) * weight;
        totalWeight += weight;
      }
    }
    
    // Normalize based on actual weights used
    if (totalWeight > 0) {
      confidence = 0.5 + (confidence - 0.5) * (1 / totalWeight);
    }
    
    // Bound confidence to 0.05-0.95 range
    confidence = Math.max(0.05, Math.min(0.95, confidence));
    
    // Convert to 0-100 scale
    return Math.round(confidence * 100);
  }
  
  /**
   * NBA specific calculation functions
   */
  private static calculateNbaPaceFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.pace || !awayStats.pace) return 0.5;
    
    // Average of both teams' pace - higher means more likely to go over
    const avgPace = (homeStats.pace + awayStats.pace) / 2;
    // League average pace is around 100, normalize to 0-1
    return Math.max(0, Math.min(1, (avgPace - 90) / 20));
  }
  
  private static calculateNbaOffensiveEfficiencyFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.offensiveRating || !awayStats.offensiveRating) return 0.5;
    
    // Difference between home and away offensive ratings
    const diff = homeStats.offensiveRating - awayStats.offensiveRating;
    // Normalize: ~10 point difference is significant
    return Math.max(0, Math.min(1, (diff / 20) + 0.5));
  }
  
  private static calculateNbaDefensiveEfficiencyFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.defensiveRating || !awayStats.defensiveRating) return 0.5;
    
    // For defensive rating, lower is better
    const diff = awayStats.defensiveRating - homeStats.defensiveRating;
    // Normalize: ~10 point difference is significant
    return Math.max(0, Math.min(1, (diff / 20) + 0.5));
  }
  
  private static calculateNbaNetRatingFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.offensiveRating || !homeStats.defensiveRating || 
        !awayStats.offensiveRating || !awayStats.defensiveRating) return 0.5;
    
    const homeNetRating = homeStats.offensiveRating - homeStats.defensiveRating;
    const awayNetRating = awayStats.offensiveRating - awayStats.defensiveRating;
    const diff = homeNetRating - awayNetRating;
    
    // Normalize: ~10 point net rating difference is significant
    return Math.max(0, Math.min(1, (diff / 20) + 0.5));
  }
  
  /**
   * MLB specific calculation functions
   */
  private static calculateMlbTeamPitchingFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.teamERA || !homeStats.teamWHIP || 
        !awayStats.teamERA || !awayStats.teamWHIP) return 0.5;
    
    // For ERA and WHIP, lower is better
    const eraDiff = awayStats.teamERA - homeStats.teamERA;
    const whipDiff = awayStats.teamWHIP - homeStats.teamWHIP;
    
    // Normalize and combine
    const eraNormalized = Math.max(0, Math.min(1, (eraDiff / 2) + 0.5)); // 2 ERA difference is significant
    const whipNormalized = Math.max(0, Math.min(1, (whipDiff / 0.4) + 0.5)); // 0.4 WHIP difference is significant
    
    return (eraNormalized * 0.6) + (whipNormalized * 0.4); // Weight ERA slightly more
  }
  
  private static calculateMlbBallparkFactor(homeTeam: string): number {
    // Ballpark factors (1.0 is neutral, >1.0 favors hitters, <1.0 favors pitchers)
    const ballparkFactors: Record<string, number> = {
      'Colorado Rockies': 1.15, // Coors Field is extremely hitter-friendly
      'Boston Red Sox': 1.08, // Fenway Park is hitter-friendly
      'Cincinnati Reds': 1.07, // Great American Ball Park is hitter-friendly
      'Philadelphia Phillies': 1.06, // Citizens Bank Park is hitter-friendly
      'Los Angeles Angels': 1.05, // Angel Stadium is hitter-friendly
      
      'San Francisco Giants': 0.92, // Oracle Park is pitcher-friendly
      'Oakland Athletics': 0.93, // Oakland Coliseum is pitcher-friendly
      'Seattle Mariners': 0.94, // T-Mobile Park is pitcher-friendly
      'Los Angeles Dodgers': 0.95, // Dodger Stadium is pitcher-friendly
      'Tampa Bay Rays': 0.95, // Tropicana Field is pitcher-friendly
    };
    
    const factor = ballparkFactors[homeTeam] || 1.0; // Default to neutral
    
    // Convert to 0-1 scale (0.8-1.2 range → 0-1)
    return Math.max(0, Math.min(1, (factor - 0.8) / 0.4));
  }
}