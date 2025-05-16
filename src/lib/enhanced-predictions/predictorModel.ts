import { Game, PredictionType, SportType, Prediction } from '../../models/types.js';
import { prisma } from '../../lib/prisma.js';

// Define the missing types locally since they're not exported from predictionService
interface TeamStats {
  wins: number;
  losses: number;
  homeWinPercentage?: number;
  awayWinPercentage?: number;
  lastTenGames?: string;
  pointsFor?: number;
  pointsAgainst?: number;
  runsScored?: number;
  runsAllowed?: number;
  teamERA?: number;
  teamWHIP?: number;
  avgVsLHP?: number;
  avgVsRHP?: number;
  // NBA specific stats
  pace?: number;
  offensiveRating?: number;
  defensiveRating?: number;
  keyPlayers?: {
    batting?: Array<{
      ops: string;
      wRCPlus: number;
      war: string;
    }>;
    pitching?: Array<{
      era: string;
      whip: string;
      fip: string;
      war: string;
    }>;
  };
}

interface H2HStats {
  totalGames: number;
  homeTeamWins: number;
}

export interface EnhancedFactors {
  // Base factors
  overallRecordFactor: number;
  homeAwaySplitFactor: number;
  recentFormFactor: number;
  headToHeadFactor: number;
  scoringDiffFactor: number;
  
  // MLB specific factors
  pitcherMatchupFactor?: number;
  teamPitchingFactor?: number;
  batterHandednessFactor?: number;
  ballparkFactor?: number;
  battingStrengthFactor?: number;
  pitchingStrengthFactor?: number;
  keyPlayerImpactFactor?: number;
  restFactor?: number;
}

interface ModelWeights {
  [key: string]: { [key in PredictionType]: number };
}

// Enhanced prediction model with advanced analytics
export class PredictorModel {
  // Weights trained on historical data
  private static readonly MLB_WEIGHTS: ModelWeights = {
    'overallRecordFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.12, 'TOTAL': 0.05 },
    'homeAwaySplitFactor': { 'SPREAD': 0.12, 'MONEYLINE': 0.15, 'TOTAL': 0.05 },
    'recentFormFactor': { 'SPREAD': 0.15, 'MONEYLINE': 0.15, 'TOTAL': 0.05 },
    'pitcherMatchupFactor': { 'SPREAD': 0.20, 'MONEYLINE': 0.12, 'TOTAL': 0.15 },
    'teamPitchingFactor': { 'SPREAD': 0.15, 'MONEYLINE': 0.08, 'TOTAL': 0.12 },
    'ballparkFactor': { 'SPREAD': 0.08, 'MONEYLINE': 0.05, 'TOTAL': 0.10 },
    'weatherFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.08, 'TOTAL': 0.08 },
    'restFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.15, 'TOTAL': 0.05 }
  };
  
  /**
   * Calculate enhanced prediction factors
   */
  public static calculateEnhancedFactors(
    homeStats: TeamStats,
    awayStats: TeamStats,
    h2hStats: H2HStats | null,
    game: Game
  ): EnhancedFactors {
    // Calculate standard factors
    const homeWinPct = homeStats.wins / (homeStats.wins + homeStats.losses || 1);
    const awayWinPct = awayStats.wins / (awayStats.wins + awayStats.losses || 1);
    const homeHomeWinPct = homeStats.homeWinPercentage ?? 0.5;
    const awayAwayWinPct = awayStats.awayWinPercentage ?? 0.5;
    
    // Calculate normalized factors (0.5 means neutral, >0.5 favors home, <0.5 favors away)
    const overallRecordFactor = (homeWinPct - awayWinPct + 1) / 2;
    const homeAwaySplitFactor = (homeHomeWinPct - awayAwayWinPct + 1) / 2;
    
    // Recent form (last 10 games)
    const homeRecentWins = parseInt(homeStats.lastTenGames?.split('-')[0] ?? '0');
    const awayRecentWins = parseInt(awayStats.lastTenGames?.split('-')[0] ?? '0');
    const recentFormFactor = (homeRecentWins - awayRecentWins + 10) / 20;
    
    // Head-to-head factor
    let headToHeadFactor = 0.5; // Default to neutral
    if (h2hStats && h2hStats.totalGames > 0) {
      const h2hWinPct = h2hStats.homeTeamWins / h2hStats.totalGames;
      headToHeadFactor = h2hWinPct;
    }
    
    // Scoring differential factor
    const homeRunDiff = (homeStats.runsScored ?? 0) - (homeStats.runsAllowed ?? 0);
    const awayRunDiff = (awayStats.runsScored ?? 0) - (awayStats.runsAllowed ?? 0);
    // Normalize to 0-1 range (assuming reasonable MLB run differences)
    const scoringDiffFactor = ((homeRunDiff - awayRunDiff) / 3) + 0.5;
    
    // Base factors
    const factors: EnhancedFactors = {
      overallRecordFactor,
      homeAwaySplitFactor,
      recentFormFactor,
      headToHeadFactor,
      scoringDiffFactor
    };
    
    // MLB specific factors
    const pitcherMatchupFactor = this.calculateMlbPitcherMatchupFactor(homeStats, awayStats);
    const teamPitchingFactor = this.calculateMlbTeamPitchingFactor(homeStats, awayStats);
    const batterHandednessFactor = this.calculateMlbBatterHandednessFactor(homeStats, awayStats);
    const ballparkFactor = this.calculateMlbBallparkFactor(game.homeTeamName);
    const battingStrengthFactor = this.calculateMlbBattingStrengthFactor(homeStats, awayStats);
    const pitchingStrengthFactor = this.calculateMlbPitchingStrengthFactor(homeStats, awayStats);
    const keyPlayerImpactFactor = this.calculateMlbKeyPlayerImpactFactor(homeStats, awayStats);
    
    return {
      ...factors,
      pitcherMatchupFactor,
      teamPitchingFactor,
      batterHandednessFactor,
      ballparkFactor,
      battingStrengthFactor,
      pitchingStrengthFactor,
      keyPlayerImpactFactor
    };
  }
  
  /**
   * Calculate confidence score based on enhanced factors
   */
  public static calculateConfidence(
    predictionType: PredictionType,
    factors: EnhancedFactors
  ): number {
    const weights = this.MLB_WEIGHTS;
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
    
    // Bound confidence to 0-1 range
    confidence = Math.max(0, Math.min(1, confidence));
    
    // Convert to 0-100 scale
    return Math.round(confidence * 100);
  }
  
  /**
   * MLB specific calculation functions
   */
  private static calculateMlbPitcherMatchupFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.teamERA || !awayStats.teamERA) return 0.5;
    
    // Compare team ERAs
    const eraDiff = awayStats.teamERA - homeStats.teamERA;
    // Normalize: ~1.0 ERA difference is significant
    return Math.max(0, Math.min(1, (eraDiff / 2) + 0.5));
  }

  private static calculateMlbTeamPitchingFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.teamWHIP || !awayStats.teamWHIP) return 0.5;
    
    // Compare team WHIPs
    const whipDiff = awayStats.teamWHIP - homeStats.teamWHIP;
    // Normalize: ~0.2 WHIP difference is significant
    return Math.max(0, Math.min(1, (whipDiff / 0.4) + 0.5));
  }

  private static calculateMlbBatterHandednessFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    // Compare team performance against left/right-handed pitchers
    const homeVsLHP = homeStats.avgVsLHP || 0;
    const homeVsRHP = homeStats.avgVsRHP || 0;
    const awayVsLHP = awayStats.avgVsLHP || 0;
    const awayVsRHP = awayStats.avgVsRHP || 0;
    
    // Calculate advantage based on handedness matchups
    const homeAdvantage = Math.max(homeVsLHP, homeVsRHP);
    const awayAdvantage = Math.max(awayVsLHP, awayVsRHP);
    
    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, (homeAdvantage - awayAdvantage + 0.3) / 0.6));
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

  private static calculateMlbBattingStrengthFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.keyPlayers?.batting || !awayStats.keyPlayers?.batting) return 0.5;
    
    const calculateTeamBattingStrength = (players: typeof homeStats.keyPlayers.batting) => {
      return players.reduce((acc, player) => {
        const ops = parseFloat(player.ops);
        const wRCPlus = player.wRCPlus;
        return acc + (ops * 0.6 + (wRCPlus / 150) * 0.4);
      }, 0) / Math.max(players.length, 1);
    };

    const homeStrength = calculateTeamBattingStrength(homeStats.keyPlayers.batting);
    const awayStrength = calculateTeamBattingStrength(awayStats.keyPlayers.batting);
    
    // Normalize to 0-1 range (assuming OPS typically ranges from 0.600 to 1.000)
    return Math.max(0, Math.min(1, (homeStrength - awayStrength + 0.2) / 0.4));
  }

  private static calculateMlbPitchingStrengthFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.keyPlayers?.pitching || !awayStats.keyPlayers?.pitching) return 0.5;
    
    const calculateTeamPitchingStrength = (players: typeof homeStats.keyPlayers.pitching) => {
      return players.reduce((acc, player) => {
        const era = parseFloat(player.era);
        const whip = parseFloat(player.whip);
        const fip = parseFloat(player.fip);
        return acc + ((4.5 - era) * 0.4 + (1.3 - whip) * 0.3 + (4.5 - fip) * 0.3);
      }, 0) / Math.max(players.length, 1);
    };

    const homeStrength = calculateTeamPitchingStrength(homeStats.keyPlayers.pitching);
    const awayStrength = calculateTeamPitchingStrength(awayStats.keyPlayers.pitching);
    
    // Normalize to 0-1 range (assuming ERA typically ranges from 2.00 to 6.00)
    return Math.max(0, Math.min(1, (homeStrength - awayStrength + 2) / 4));
  }

  private static calculateMlbKeyPlayerImpactFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.keyPlayers || !awayStats.keyPlayers) return 0.5;
    
    // Calculate impact based on top performers
    const getTopPlayerImpact = (players: typeof homeStats.keyPlayers.batting | typeof homeStats.keyPlayers.pitching) => {
      if (!players || players.length === 0) return 0;
      
      // Sort by WAR (assuming higher WAR means more impact)
      const sortedPlayers = [...players].sort((a, b) => 
        parseFloat(b.war) - parseFloat(a.war)
      );
      
      // Take top 3 players and calculate their combined impact
      return sortedPlayers.slice(0, 3).reduce((acc, player) => 
        acc + parseFloat(player.war), 0
      );
    };

    const homeBattingImpact = getTopPlayerImpact(homeStats.keyPlayers.batting);
    const homePitchingImpact = getTopPlayerImpact(homeStats.keyPlayers.pitching);
    const awayBattingImpact = getTopPlayerImpact(awayStats.keyPlayers.batting);
    const awayPitchingImpact = getTopPlayerImpact(awayStats.keyPlayers.pitching);

    const homeTotalImpact = homeBattingImpact + homePitchingImpact;
    const awayTotalImpact = awayBattingImpact + awayPitchingImpact;
    
    // Normalize to 0-1 range (assuming WAR typically ranges from 0 to 10 per player)
    return Math.max(0, Math.min(1, (homeTotalImpact - awayTotalImpact + 15) / 30));
  }

  private static async calculateSpreadConfidence(factors: EnhancedFactors, game: Game): Promise<number> {
    let confidence = 0.5;
    
    // Team strength impact (reduced weight for large spreads)
    const teamStrengthImpact = factors.overallRecordFactor * 0.15 +
      factors.homeAwaySplitFactor * 0.12 +
      factors.recentFormFactor * 0.15;
    
    // Pitching impact (increased weight for large spreads)
    const pitchingImpact = factors.pitcherMatchupFactor * 0.20 +
      factors.teamPitchingFactor * 0.15;
    
    // Situational impact
    const situationalImpact = factors.restFactor * 0.05;
    
    // Park and weather impact
    const parkFactor = this.calculateMlbBallparkFactor(game.homeTeamName);
    const parkImpact = (parkFactor - 1.0) * 0.10;
    
    // Calculate base confidence
    confidence = teamStrengthImpact + pitchingImpact + situationalImpact + parkImpact;
    
    // Adjust confidence based on margin of error in recent predictions
    const marginAdjustment = await this.calculateMarginAdjustment(game);
    confidence *= marginAdjustment;
    
    // Cap between 0.55 and 0.85
    return Math.min(0.85, Math.max(0.55, confidence));
  }

  private static async calculateMarginAdjustment(game: Game): Promise<number> {
    const recentErrors = await this.getRecentPredictionErrors(game);
    
    if (recentErrors.length === 0) {
      return 1.0; // No historical data
    }

    // Calculate error statistics
    const avgError = recentErrors.reduce((sum, error) => sum + error, 0) / recentErrors.length;
    const maxError = Math.max(...recentErrors);
    const errorStdDev = Math.sqrt(
      recentErrors.reduce((sum, error) => sum + Math.pow(error - avgError, 2), 0) / recentErrors.length
    );

    // Calculate spread-specific adjustment
    const spreadStr = game.odds?.spread?.homeSpread?.toString() || '0';
    const spread = parseFloat(spreadStr);
    let spreadAdjustment = 1.0;
    
    if (Math.abs(spread) > 2.0) {
      spreadAdjustment = 0.85; // More conservative for large spreads
    } else if (Math.abs(spread) > 1.5) {
      spreadAdjustment = 0.9;
    }

    // Calculate error-based adjustment
    let errorAdjustment = 1.0;
    if (avgError > 3.0 || maxError > 5.0) {
      errorAdjustment = 0.7; // Large errors
    } else if (avgError > 2.0 || maxError > 4.0) {
      errorAdjustment = 0.8; // Moderate errors
    } else if (avgError > 1.0 || maxError > 3.0) {
      errorAdjustment = 0.9; // Small errors
    }

    // Calculate volatility adjustment
    let volatilityAdjustment = 1.0;
    if (errorStdDev > 2.0) {
      volatilityAdjustment = 0.85; // High volatility
    } else if (errorStdDev > 1.5) {
      volatilityAdjustment = 0.9; // Moderate volatility
    }

    // Combine adjustments
    return spreadAdjustment * errorAdjustment * volatilityAdjustment;
  }

  private static async getRecentPredictionErrors(game: Game): Promise<number[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent predictions with similar spread values
    const recentPredictions = await prisma.prediction.findMany({
      where: {
        predictionType: 'SPREAD',
        createdAt: {
          gte: thirtyDaysAgo
        },
        game: {
          status: 'FINAL'
        }
      },
      include: {
        game: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Calculate prediction errors
    const errors: number[] = [];
    for (const prediction of recentPredictions) {
      if (!prediction.game.homeScore || !prediction.game.awayScore) continue;

      const predictedSpread = parseFloat(prediction.predictionValue);
      const actualSpread = prediction.game.homeScore - prediction.game.awayScore;
      const error = Math.abs(predictedSpread - actualSpread);

      // Only include errors for similar spread ranges
      const currentSpread = parseFloat(String(game.odds?.spread?.homeSpread || '0'));
      if (Math.abs(predictedSpread - currentSpread) <= 0.5) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Format enhanced factors into a structured JSON object for the reasoning field
   */
  public static formatReasoning(factors: EnhancedFactors): string {
    // Create a structured object with all factors
    const reasoning = {
      teamStrength: factors.overallRecordFactor,
      homeAdvantage: factors.homeAwaySplitFactor,
      recentForm: factors.recentFormFactor,
      headToHead: factors.headToHeadFactor,
      scoringDifferential: factors.scoringDiffFactor,
      pitcherMatchup: factors.pitcherMatchupFactor,
      teamPitching: factors.teamPitchingFactor,
      batterHandedness: factors.batterHandednessFactor,
      ballpark: factors.ballparkFactor,
      battingStrength: factors.battingStrengthFactor,
      pitchingStrength: factors.pitchingStrengthFactor,
      keyPlayerImpact: factors.keyPlayerImpactFactor,
      rest: factors.restFactor
    };

    // Convert to JSON string with 2-space indentation for readability
    return JSON.stringify(reasoning, null, 2);
  }
}