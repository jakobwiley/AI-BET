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
  // New MLB player factors
  battingStrengthFactor?: number;
  pitchingStrengthFactor?: number;
  keyPlayerImpactFactor?: number;
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
    'pitcherMatchupFactor': { 'SPREAD': 0.15, 'MONEYLINE': 0.12, 'TOTAL': 0.15 },
    'teamPitchingFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.08, 'TOTAL': 0.12 },
    'batterHandednessFactor': { 'SPREAD': 0.05, 'MONEYLINE': 0.05, 'TOTAL': 0.03 },
    'ballparkFactor': { 'SPREAD': 0.05, 'MONEYLINE': 0.05, 'TOTAL': 0.10 },
    // New weights for player factors
    'battingStrengthFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.10, 'TOTAL': 0.15 },
    'pitchingStrengthFactor': { 'SPREAD': 0.10, 'MONEYLINE': 0.10, 'TOTAL': 0.15 },
    'keyPlayerImpactFactor': { 'SPREAD': 0.05, 'MONEYLINE': 0.05, 'TOTAL': 0.05 }
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
    let scoringDiffFactor = 0.5; // Default to neutral
    if (sport === 'NBA') {
      const homeNetRating = (homeStats.pointsFor ?? 0) - (homeStats.pointsAgainst ?? 0);
      const awayNetRating = (awayStats.pointsFor ?? 0) - (awayStats.pointsAgainst ?? 0);
      // Normalize to 0-1 range (assuming reasonable NBA scoring differences)
      scoringDiffFactor = ((homeNetRating - awayNetRating) / 20) + 0.5;
    } else if (sport === 'MLB') {
      const homeRunDiff = (homeStats.runsScored ?? 0) - (homeStats.runsAllowed ?? 0);
      const awayRunDiff = (awayStats.runsScored ?? 0) - (awayStats.runsAllowed ?? 0);
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
      const pitcherMatchupFactor = this.calculateMlbPitcherMatchupFactor(homeStats, awayStats);
      const teamPitchingFactor = this.calculateMlbTeamPitchingFactor(homeStats, awayStats);
      const batterHandednessFactor = this.calculateMlbBatterHandednessFactor(homeStats, awayStats);
      const ballparkFactor = this.calculateMlbBallparkFactor(game.homeTeamName);
      // New player factors
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
    
    // Bound confidence to 0-1 range
    confidence = Math.max(0, Math.min(1, confidence));
    
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
}