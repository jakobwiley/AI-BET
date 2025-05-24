// import { Game, PredictionType, SportType, Prediction } from '../../models/types';
import { prisma } from '../../lib/prisma.js';
// Fallback types if not imported
export type PredictionType = 'SPREAD' | 'MONEYLINE' | 'TOTAL';
export interface Game {
  sport: string;
  homeTeamName: string;
  awayTeamName: string;
  probableHomePitcherId?: number;
  probableAwayPitcherId?: number;
  [key: string]: any;
}

// Advanced MLB pitching factors
import { calculatePitcherMatchupFactor, calculateBullpenFactor, calculateRecentFormFactor } from '../../experimental/advanced-pitching/factorCalculator';

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
      scoringDiffFactor,
      // MLB specific factors will be filled below
    };

    // MLB specific factors
    if ((game as any).sport === 'MLB') {
      // Extract advanced stats if present (from keyPlayers.pitching[0] or similar)
      const extractAdvanced = (stats: TeamStats) => {
        const p = stats.keyPlayers?.pitching?.[0];
        return {
          bullpenEra: (p && typeof (p as any).bullpenEra === 'number') ? (p as any).bullpenEra : undefined,
          recentFormEra: (p && typeof (p as any).recentFormEra === 'number') ? (p as any).recentFormEra : undefined
        };
      };
      const homeAdv = extractAdvanced(homeStats);
      const awayAdv = extractAdvanced(awayStats);
      try {
        // Only use advanced logic if at least one of the advanced fields is present
        if (homeAdv.bullpenEra !== undefined || awayAdv.bullpenEra !== undefined || homeAdv.recentFormEra !== undefined || awayAdv.recentFormEra !== undefined) {
          factors.pitcherMatchupFactor = calculatePitcherMatchupFactor(homeStats as any, awayStats as any);
          const homeBullpen = calculateBullpenFactor(homeAdv.bullpenEra);
          const awayBullpen = calculateBullpenFactor(awayAdv.bullpenEra);
          const homeRecent = calculateRecentFormFactor(homeAdv.recentFormEra);
          const awayRecent = calculateRecentFormFactor(awayAdv.recentFormEra);
          factors.teamPitchingFactor = ((homeBullpen + homeRecent) - (awayBullpen + awayRecent)) * 0.25 + 0.5;
        } else {
          // Fallback to legacy calculations if advanced data not present
          factors.pitcherMatchupFactor = PredictorModel.calculateMlbPitcherMatchupFactor(homeStats, awayStats);
          factors.teamPitchingFactor = PredictorModel.calculateMlbTeamPitchingFactor(homeStats, awayStats);
        }
      } catch (e) {
        console.warn('Advanced pitching factor calculation failed, falling back to legacy logic:', e);
        // Fallback to legacy calculations if needed
        factors.pitcherMatchupFactor = PredictorModel.calculateMlbPitcherMatchupFactor(homeStats, awayStats);
        factors.teamPitchingFactor = PredictorModel.calculateMlbTeamPitchingFactor(homeStats, awayStats);
      }
    }

    // Rest of the MLB specific factors
    if ((game as any).sport === 'MLB') {
      const batterHandednessFactor = this.calculateMlbBatterHandednessFactor(homeStats, awayStats);
      const ballparkFactor = this.calculateMlbBallparkFactor(game.homeTeamName);
      const battingStrengthFactor = this.calculateMlbBattingStrengthFactor(homeStats, awayStats);
      const pitchingStrengthFactor = this.calculateMlbPitchingStrengthFactor(homeStats, awayStats);
      const keyPlayerImpactFactor = this.calculateMlbKeyPlayerImpactFactor(homeStats, awayStats);
      return {
        ...factors,
        batterHandednessFactor,
        ballparkFactor,
        battingStrengthFactor,
        pitchingStrengthFactor,
        keyPlayerImpactFactor
      };
    }

    return factors;
  }

  // Placeholder: Ballpark factor (should use real park data)
  private static calculateMlbBallparkFactor(homeTeamName: string): number {
    // Simple default: 1.0 (neutral)
    return 1.0;
  }

  // Placeholder: Batting strength factor
  private static calculateMlbBattingStrengthFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    // Simple normalized difference in runs scored
    const home = homeStats.runsScored ?? 0;
    const away = awayStats.runsScored ?? 0;
    return Math.max(0, Math.min(1, (home - away + 20) / 40));
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
    // Advanced stats: ERA, FIP, xFIP, SIERA, K/BB, WAR
    const getPitcherStats = (stats: TeamStats) => {
      const p = stats.keyPlayers?.pitching?.[0];
      if (!p) return null;
      return {
        era: parseFloat(p.era),
        fip: parseFloat((p as any).fip ?? '0'),
        xfip: parseFloat((p as any).xfip ?? '0'),
        siera: parseFloat((p as any).siera ?? '0'),
        kbb: parseFloat((p as any).kbb ?? '0'),
        war: parseFloat((p as any).war ?? '0'),
      };
    };
    const home = getPitcherStats(homeStats);
    const away = getPitcherStats(awayStats);
    if (!home || !away) {
      console.warn('Missing pitcher stats for matchup factor', { home: !!home, away: !!away });
      return 0.5;
    }
    // Composite difference (lower is better for home)
    const weights = { era: 0.25, fip: 0.2, xfip: 0.15, siera: 0.15, kbb: 0.15, war: 0.1 };
    const diff = (
      (away.era - home.era) * weights.era +
      (away.fip - home.fip) * weights.fip +
      (away.xfip - home.xfip) * weights.xfip +
      (away.siera - home.siera) * weights.siera +
      (home.kbb - away.kbb) * weights.kbb + // Higher K/BB is better
      (home.war - away.war) * weights.war // Higher WAR is better
    );
    const normalized = Math.max(0, Math.min(1, (diff / 2) + 0.5));
    console.info('PitcherMatchupFactor', { home, away, diff, normalized });
    return normalized;
  }

  private static calculateMlbTeamPitchingFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    // Use advanced stats for all pitchers
    const getTeamPitchingStats = (stats: TeamStats) => {
      const ps = stats.keyPlayers?.pitching ?? [];
      let sum = { era: 0, fip: 0, xfip: 0, siera: 0, kbb: 0, war: 0 };
      let count = 0;
      for (const p of ps) {
        if (p.era && (p as any).fip) {
          sum.era += parseFloat(p.era);
          sum.fip += parseFloat((p as any).fip ?? '0');
          sum.xfip += parseFloat((p as any).xfip ?? '0');
          sum.siera += parseFloat((p as any).siera ?? '0');
          sum.kbb += parseFloat((p as any).kbb ?? '0');
          sum.war += parseFloat((p as any).war ?? '0');
          count++;
        }
      }
      if (count === 0) return null;
      return {
        era: sum.era / count,
        fip: sum.fip / count,
        xfip: sum.xfip / count,
        siera: sum.siera / count,
        kbb: sum.kbb / count,
        war: sum.war / count,
      };
    };
    const home = getTeamPitchingStats(homeStats);
    const away = getTeamPitchingStats(awayStats);
    if (!home || !away) {
      console.warn('Missing team pitching stats for team pitching factor', { home: !!home, away: !!away });
      return 0.5;
    }
    // Composite difference (lower is better for home)
    const weights = { era: 0.25, fip: 0.2, xfip: 0.15, siera: 0.15, kbb: 0.15, war: 0.1 };
    const diff = (
      (away.era - home.era) * weights.era +
      (away.fip - home.fip) * weights.fip +
      (away.xfip - home.xfip) * weights.xfip +
      (away.siera - home.siera) * weights.siera +
      (home.kbb - away.kbb) * weights.kbb +
      (home.war - away.war) * weights.war
    );
    const normalized = Math.max(0, Math.min(1, (diff / 2) + 0.5));
    console.info('TeamPitchingFactor', { home, away, diff, normalized });
    return normalized;
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

  private static calculateMlbPitchingStrengthFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.keyPlayers?.pitching || !awayStats.keyPlayers?.pitching) return 0.5;
    const calculateTeamPitchingStrength = (players: typeof homeStats.keyPlayers.pitching) => {
      let total = 0;
      let count = 0;
      for (const p of players) {
        const era = parseFloat(p.era ?? '0');
        const whip = parseFloat(p.whip ?? '0');
        const fip = parseFloat((p as any).fip ?? '0');
        const xfip = parseFloat((p as any).xfip ?? '0');
        const siera = parseFloat((p as any).siera ?? '0');
        const kbb = parseFloat((p as any).kbb ?? '0');
        const war = parseFloat((p as any).war ?? '0');
        if (isNaN(era) && isNaN(whip) && isNaN(fip) && isNaN(xfip) && isNaN(siera) && isNaN(kbb) && isNaN(war)) continue;
        // Weighted: ERA, FIP, xFIP, SIERA (lower is better), K/BB and WAR (higher is better)
        total += ((4.5 - era) * 0.18 + (1.3 - whip) * 0.15 + (4.5 - fip) * 0.18 + (4.5 - xfip) * 0.15 + (4.5 - siera) * 0.15 + kbb * 0.1 + war * 0.09);
        count++;
        if (!p.era || !(p as any).fip || !(p as any).xfip || !(p as any).siera || !(p as any).kbb || !(p as any).war) {
          console.warn('Missing advanced pitching stats for player', p);
        }
      }
      return count === 0 ? 0 : total / count;
    };
    const homeStrength = calculateTeamPitchingStrength(homeStats.keyPlayers.pitching);
    const awayStrength = calculateTeamPitchingStrength(awayStats.keyPlayers.pitching);
    const normalized = Math.max(0, Math.min(1, (homeStrength - awayStrength + 2) / 4));
    console.info('PitchingStrengthFactor', { homeStrength, awayStrength, normalized });
    return normalized;
  }

  private static calculateMlbKeyPlayerImpactFactor(homeStats: TeamStats, awayStats: TeamStats): number {
    if (!homeStats.keyPlayers || !awayStats.keyPlayers) return 0.5;
    // Calculate impact based on top performers using WAR and advanced stats
    const getTopPlayerImpact = (players: typeof homeStats.keyPlayers.batting | typeof homeStats.keyPlayers.pitching) => {
      if (!players || players.length === 0) return 0;
      // Sort by WAR (higher WAR = more impact)
      const sortedPlayers = [...players].sort((a, b) => parseFloat(b.war) - parseFloat(a.war));
      // Take top 3 players and factor in SIERA/FIP/KBB if available
      return sortedPlayers.slice(0, 3).reduce((acc, player) => {
        let war = parseFloat(player.war ?? '0');
        let siera = parseFloat((player as any).siera ?? '0');
        let fip = parseFloat((player as any).fip ?? '0');
        let kbb = parseFloat((player as any).kbb ?? '0');
        // If WAR is close, boost by lower SIERA/FIP and higher K/BB
        let bonus = 0;
        if (!isNaN(siera) && siera > 0) bonus += (4.5 - siera) * 0.08;
        if (!isNaN(fip) && fip > 0) bonus += (4.5 - fip) * 0.08;
        if (!isNaN(kbb) && kbb > 0) bonus += kbb * 0.06;
        if (!player.war || !(player as any).siera || !(player as any).fip || !(player as any).kbb) {
          console.warn('Missing advanced stats for key player impact', player);
        }
        return acc + war + bonus;
      }, 0);
    };
    const homeBattingImpact = getTopPlayerImpact(homeStats.keyPlayers.batting);
    const homePitchingImpact = getTopPlayerImpact(homeStats.keyPlayers.pitching);
    const awayBattingImpact = getTopPlayerImpact(awayStats.keyPlayers.batting);
    const awayPitchingImpact = getTopPlayerImpact(awayStats.keyPlayers.pitching);
    const homeTotalImpact = homeBattingImpact + homePitchingImpact;
    const awayTotalImpact = awayBattingImpact + awayPitchingImpact;
    const normalized = Math.max(0, Math.min(1, (homeTotalImpact - awayTotalImpact + 15) / 30));
    console.info('KeyPlayerImpactFactor', { homeTotalImpact, awayTotalImpact, normalized });
    return normalized;
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