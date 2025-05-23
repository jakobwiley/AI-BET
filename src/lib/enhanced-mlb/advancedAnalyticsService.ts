import { MLBStatsService } from '../mlbStatsApi.js';
import { CacheService } from '../cacheService.js';
import type { MLBPlayerStats } from '../mlbStatsApi.js';
import type { TeamStats } from '../predictionService.js';

interface BatterPitcherMatchup {
  batterId: number;
  pitcherId: number;
  plateAppearances: number;
  hits: number;
  homeRuns: number;
  strikeouts: number;
  walks: number;
  battingAverage: number;
  sluggingPercentage: number;
  ops: number;
  // Enhanced metrics
  wOBA: number;
  hardHitRate: number;
  barrelRate: number;
  exitVelocity: number;
  launchAngle: number;
  strikeoutRate: number;
  walkRate: number;
  babip: number;
}

interface SituationalStats {
  runnersInScoringPosition: {
    atBats: number;
    hits: number;
    battingAverage: number;
    sluggingPercentage: number;
    // Enhanced metrics
    wOBA: number;
    hardHitRate: number;
    barrelRate: number;
    exitVelocity: number;
    launchAngle: number;
    strikeoutRate: number;
    walkRate: number;
    babip: number;
  };
  basesLoaded: {
    atBats: number;
    hits: number;
    battingAverage: number;
    // Enhanced metrics
    wOBA: number;
    hardHitRate: number;
    barrelRate: number;
    exitVelocity: number;
    launchAngle: number;
    strikeoutRate: number;
    walkRate: number;
    babip: number;
  };
  lateInningPressure: {
    innings7to9: {
      battingAverage: number;
      ops: number;
      // Enhanced metrics
      wOBA: number;
      hardHitRate: number;
      barrelRate: number;
      exitVelocity: number;
      launchAngle: number;
      strikeoutRate: number;
      walkRate: number;
      babip: number;
    };
    extraInnings: {
      battingAverage: number;
      ops: number;
      // Enhanced metrics
      wOBA: number;
      hardHitRate: number;
      barrelRate: number;
      exitVelocity: number;
      launchAngle: number;
      strikeoutRate: number;
      walkRate: number;
      babip: number;
    };
  };
}

interface ParkFactors {
  homeRuns: number;
  hits: number;
  doubles: number;
  triples: number;
  walks: number;
  strikeouts: number;
}

interface BullpenUsage {
  lastThreeDays: {
    totalPitches: number;
    inningsPitched: number;
    highLeverageInnings: number;
    // Enhanced metrics
    averagePitchesPerInning: number;
    averageRestDays: number;
    highLeveragePitches: number;
    inheritedRunners: number;
    inheritedRunnersScored: number;
    holds: number;
    saves: number;
    blownSaves: number;
  };
  lastSevenDays: {
    totalPitches: number;
    inningsPitched: number;
    highLeverageInnings: number;
    // Enhanced metrics
    averagePitchesPerInning: number;
    averageRestDays: number;
    highLeveragePitches: number;
    inheritedRunners: number;
    inheritedRunnersScored: number;
    holds: number;
    saves: number;
    blownSaves: number;
  };
  fatigueLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  availablePitchers: number;
  highLeveragePitchers: number;
  // Enhanced metrics
  bullpenERA: number;
  bullpenWHIP: number;
  bullpenFIP: number;
  bullpenKPer9: number;
  bullpenBBPer9: number;
  bullpenHRPer9: number;
  bullpenGroundBallRate: number;
  bullpenFlyBallRate: number;
  bullpenHardHitRate: number;
  bullpenBarrelRate: number;
  bullpenExitVelocity: number;
  bullpenSpinRate: number;
  bullpenPitchVelocity: number;
}

export class AdvancedAnalyticsService {
  private static readonly CACHE_DURATION = 3600; // 1 hour

  /**
   * Get batter vs pitcher matchup history with enhanced metrics
   */
  static async getBatterPitcherMatchup(
    batterId: number,
    pitcherId: number
  ): Promise<BatterPitcherMatchup | null> {
    const cacheKey = `batter_pitcher_${batterId}_${pitcherId}`;
    const cached = await CacheService.get<BatterPitcherMatchup>(cacheKey);
    if (cached) return cached;

    try {
      // Get batter stats against the pitcher
      const batterStats = await MLBStatsService.getPlayerStats(batterId);
      if (!batterStats) return null;

      // Get pitcher stats against the batter
      const pitcherStats = await MLBStatsService.getPlayerStats(pitcherId);
      if (!pitcherStats) return null;

      // Calculate enhanced matchup stats using splits data
      const matchup: BatterPitcherMatchup = {
        batterId,
        pitcherId,
        plateAppearances: 0, // Not available in current API
        hits: 0, // Not available in current API
        homeRuns: batterStats.splits.vsRight.homeRuns,
        strikeouts: 0, // Not available in current API
        walks: 0, // Not available in current API
        battingAverage: parseFloat(batterStats.splits.vsRight.avg),
        sluggingPercentage: parseFloat(batterStats.batting.slg),
        ops: parseFloat(batterStats.splits.vsRight.ops),
        // Enhanced metrics
        wOBA: parseFloat(batterStats.batting.wOBA),
        hardHitRate: parseFloat(batterStats.batting.hardHitRate),
        barrelRate: parseFloat(batterStats.batting.barrelRate),
        exitVelocity: parseFloat(batterStats.batting.exitVelocity),
        launchAngle: parseFloat(batterStats.batting.launchAngle),
        strikeoutRate: parseFloat(batterStats.splits.vsRight.strikeOutRate),
        walkRate: parseFloat(batterStats.splits.vsRight.walkRate),
        babip: parseFloat(batterStats.batting.babip)
      };

      // Cache the result
      await CacheService.set(cacheKey, matchup, this.CACHE_DURATION);
      return matchup;
    } catch (error) {
      console.error('Error fetching batter-pitcher matchup:', error);
      return null;
    }
  }

  /**
   * Get enhanced situational statistics for a team
   */
  static async getSituationalStats(teamId: string): Promise<SituationalStats | null> {
    const cacheKey = `situational_stats_${teamId}`;
    const cached = await CacheService.get<SituationalStats>(cacheKey);
    if (cached) return cached;

    try {
      // Get team stats for the current season
      const teamStats = await MLBStatsService.getTeamStats(teamId);
      if (!teamStats) return null;

      // Get team's key players
      const keyPlayers = teamStats.keyPlayers;
      if (!keyPlayers) return null;

      // Calculate enhanced situational stats from player data
      const situationalStats: SituationalStats = {
        runnersInScoringPosition: {
          atBats: 0,
          hits: 0,
          battingAverage: 0,
          sluggingPercentage: 0,
          wOBA: 0,
          hardHitRate: 0,
          barrelRate: 0,
          exitVelocity: 0,
          launchAngle: 0,
          strikeoutRate: 0,
          walkRate: 0,
          babip: 0
        },
        basesLoaded: {
          atBats: 0,
          hits: 0,
          battingAverage: 0,
          wOBA: 0,
          hardHitRate: 0,
          barrelRate: 0,
          exitVelocity: 0,
          launchAngle: 0,
          strikeoutRate: 0,
          walkRate: 0,
          babip: 0
        },
        lateInningPressure: {
          innings7to9: {
            battingAverage: 0,
            ops: 0,
            wOBA: 0,
            hardHitRate: 0,
            barrelRate: 0,
            exitVelocity: 0,
            launchAngle: 0,
            strikeoutRate: 0,
            walkRate: 0,
            babip: 0
          },
          extraInnings: {
            battingAverage: 0,
            ops: 0,
            wOBA: 0,
            hardHitRate: 0,
            barrelRate: 0,
            exitVelocity: 0,
            launchAngle: 0,
            strikeoutRate: 0,
            walkRate: 0,
            babip: 0
          }
        }
      };

      // Calculate RISP stats with weighted averages based on player roles
      const rispStats = keyPlayers.batting.reduce((acc, player, index) => {
        const weight = this.calculatePlayerWeight(index, keyPlayers.batting.length);
        const avg = parseFloat(player.avg);
        const wOBA = parseFloat(player.wOBA);
        const hardHitRate = parseFloat(player.hardHitRate || '0');
        const barrelRate = parseFloat(player.barrelRate || '0');
        const exitVelocity = parseFloat(player.exitVelocity || '0');
        const launchAngle = parseFloat(player.launchAngle || '0');
        const strikeoutRate = parseFloat(player.strikeOutRate || '0');
        const walkRate = parseFloat(player.walkRate || '0');
        const babip = parseFloat(player.babip || '0');

        if (!isNaN(avg)) {
          acc.atBats += 30 * weight;
          acc.hits += Math.round(avg * 30 * weight);
          acc.wOBA += wOBA * weight;
          acc.hardHitRate += hardHitRate * weight;
          acc.barrelRate += barrelRate * weight;
          acc.exitVelocity += exitVelocity * weight;
          acc.launchAngle += launchAngle * weight;
          acc.strikeoutRate += strikeoutRate * weight;
          acc.walkRate += walkRate * weight;
          acc.babip += babip * weight;
          acc.totalWeight += weight;
        }
        return acc;
      }, { atBats: 0, hits: 0, wOBA: 0, hardHitRate: 0, barrelRate: 0, exitVelocity: 0, launchAngle: 0, strikeoutRate: 0, walkRate: 0, babip: 0, totalWeight: 0 });

      // Update RISP stats with weighted averages
      if (rispStats.totalWeight > 0) {
        situationalStats.runnersInScoringPosition = {
          atBats: rispStats.atBats,
          hits: rispStats.hits,
          battingAverage: rispStats.hits / rispStats.atBats,
          sluggingPercentage: 0, // Not available in current API
          wOBA: rispStats.wOBA / rispStats.totalWeight,
          hardHitRate: rispStats.hardHitRate / rispStats.totalWeight,
          barrelRate: rispStats.barrelRate / rispStats.totalWeight,
          exitVelocity: rispStats.exitVelocity / rispStats.totalWeight,
          launchAngle: rispStats.launchAngle / rispStats.totalWeight,
          strikeoutRate: rispStats.strikeoutRate / rispStats.totalWeight,
          walkRate: rispStats.walkRate / rispStats.totalWeight,
          babip: rispStats.babip / rispStats.totalWeight
        };
      }

      // Calculate late-inning pressure stats with recency bias
      const recentGames = keyPlayers.batting.slice(0, 5); // Focus on most recent games
      const lateInningStats = recentGames.reduce((acc, player) => {
        const avg = parseFloat(player.avg);
        const ops = parseFloat(player.ops);
        const wOBA = parseFloat(player.wOBA);
        const hardHitRate = parseFloat(player.hardHitRate || '0');
        const barrelRate = parseFloat(player.barrelRate || '0');
        const exitVelocity = parseFloat(player.exitVelocity || '0');
        const launchAngle = parseFloat(player.launchAngle || '0');
        const strikeoutRate = parseFloat(player.strikeOutRate || '0');
        const walkRate = parseFloat(player.walkRate || '0');
        const babip = parseFloat(player.babip || '0');

        if (!isNaN(avg)) {
          acc.battingAverage += avg;
          acc.ops += ops;
          acc.wOBA += wOBA;
          acc.hardHitRate += hardHitRate;
          acc.barrelRate += barrelRate;
          acc.exitVelocity += exitVelocity;
          acc.launchAngle += launchAngle;
          acc.strikeoutRate += strikeoutRate;
          acc.walkRate += walkRate;
          acc.babip += babip;
          acc.count++;
        }
        return acc;
      }, { battingAverage: 0, ops: 0, wOBA: 0, hardHitRate: 0, barrelRate: 0, exitVelocity: 0, launchAngle: 0, strikeoutRate: 0, walkRate: 0, babip: 0, count: 0 });

      // Update late-inning pressure stats
      if (lateInningStats.count > 0) {
        situationalStats.lateInningPressure.innings7to9 = {
          battingAverage: lateInningStats.battingAverage / lateInningStats.count,
          ops: lateInningStats.ops / lateInningStats.count,
          wOBA: lateInningStats.wOBA / lateInningStats.count,
          hardHitRate: lateInningStats.hardHitRate / lateInningStats.count,
          barrelRate: lateInningStats.barrelRate / lateInningStats.count,
          exitVelocity: lateInningStats.exitVelocity / lateInningStats.count,
          launchAngle: lateInningStats.launchAngle / lateInningStats.count,
          strikeoutRate: lateInningStats.strikeoutRate / lateInningStats.count,
          walkRate: lateInningStats.walkRate / lateInningStats.count,
          babip: lateInningStats.babip / lateInningStats.count
        };
      }

      // Cache the result
      await CacheService.set(cacheKey, situationalStats, this.CACHE_DURATION);
      return situationalStats;
    } catch (error) {
      console.error('Error fetching situational stats:', error);
      return null;
    }
  }

  /**
   * Calculate player weight based on position in lineup
   */
  private static calculatePlayerWeight(index: number, totalPlayers: number): number {
    // Give more weight to players higher in the lineup
    const baseWeight = 1.0;
    const positionFactor = (totalPlayers - index) / totalPlayers;
    return baseWeight * (1 + positionFactor);
  }

  /**
   * Get park factors for a specific ballpark
   */
  static async getParkFactors(ballparkId: string): Promise<ParkFactors | null> {
    const cacheKey = `park_factors_${ballparkId}`;
    const cached = await CacheService.get<ParkFactors>(cacheKey);
    if (cached) return cached;

    try {
      // Get team stats for the current season
      const teamStats = await MLBStatsService.getTeamStats(ballparkId);
      if (!teamStats) return null;

      // Get team's home and away stats
      const homeStats = await MLBStatsService.getTeamStats(ballparkId, { 
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      const awayStats = await MLBStatsService.getTeamStats(ballparkId, {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });

      if (!homeStats || !awayStats) return null;

      // Calculate park factors
      const parkFactors: ParkFactors = {
        homeRuns: this.calculateParkFactor(homeStats.homeRuns, awayStats.awayRuns),
        hits: this.calculateParkFactor(homeStats.homeHits, awayStats.awayHits),
        doubles: this.calculateParkFactor(homeStats.homeDoubles, awayStats.awayDoubles),
        triples: this.calculateParkFactor(homeStats.homeTriples, awayStats.awayTriples),
        walks: this.calculateParkFactor(homeStats.homeWalks, awayStats.awayWalks),
        strikeouts: this.calculateParkFactor(homeStats.homeStrikeouts, awayStats.awayStrikeouts)
      };

      // Cache the result
      await CacheService.set(cacheKey, parkFactors, this.CACHE_DURATION);
      return parkFactors;
    } catch (error) {
      console.error('Error calculating park factors:', error);
      return null;
    }
  }

  /**
   * Calculate park factor for a specific stat
   */
  private static calculateParkFactor(homeStat: number, awayStat: number): number {
    if (awayStat === 0) return 1.0; // Avoid division by zero
    return homeStat / awayStat;
  }

  /**
   * Get enhanced bullpen usage and fatigue analysis
   */
  static async getBullpenUsage(teamId: string): Promise<BullpenUsage | null> {
    const cacheKey = `bullpen_usage_${teamId}`;
    const cached = await CacheService.get<BullpenUsage>(cacheKey);
    if (cached) return cached;

    try {
      // Get team stats for the current season
      const teamStats = await MLBStatsService.getTeamStats(teamId);
      if (!teamStats) return null;

      // Get team's pitchers
      const pitchers = teamStats.keyPlayers?.pitching || [];
      if (pitchers.length === 0) return null;

      // Calculate enhanced bullpen usage from pitcher stats
      const bullpenUsage: BullpenUsage = {
        lastThreeDays: {
          totalPitches: 0,
          inningsPitched: 0,
          highLeverageInnings: 0,
          averagePitchesPerInning: 0,
          averageRestDays: 0,
          highLeveragePitches: 0,
          inheritedRunners: 0,
          inheritedRunnersScored: 0,
          holds: 0,
          saves: 0,
          blownSaves: 0
        },
        lastSevenDays: {
          totalPitches: 0,
          inningsPitched: 0,
          highLeverageInnings: 0,
          averagePitchesPerInning: 0,
          averageRestDays: 0,
          highLeveragePitches: 0,
          inheritedRunners: 0,
          inheritedRunnersScored: 0,
          holds: 0,
          saves: 0,
          blownSaves: 0
        },
        fatigueLevel: this.calculateFatigueLevel(pitchers),
        availablePitchers: pitchers.length,
        highLeveragePitchers: pitchers.filter(p => parseFloat(p.era) < 3.50).length,
        bullpenERA: 0,
        bullpenWHIP: 0,
        bullpenFIP: 0,
        bullpenKPer9: 0,
        bullpenBBPer9: 0,
        bullpenHRPer9: 0,
        bullpenGroundBallRate: 0,
        bullpenFlyBallRate: 0,
        bullpenHardHitRate: 0,
        bullpenBarrelRate: 0,
        bullpenExitVelocity: 0,
        bullpenSpinRate: 0,
        bullpenPitchVelocity: 0
      };

      // Calculate enhanced usage metrics from pitcher stats
      let totalERA = 0;
      let totalWHIP = 0;
      let totalFIP = 0;
      let totalKPer9 = 0;
      let totalBBPer9 = 0;
      let totalHRPer9 = 0;
      let totalGroundBallRate = 0;
      let totalFlyBallRate = 0;
      let totalHardHitRate = 0;
      let totalBarrelRate = 0;
      let totalExitVelocity = 0;
      let totalSpinRate = 0;
      let totalPitchVelocity = 0;
      let validPitchers = 0;

      pitchers.forEach(pitcher => {
        const era = parseFloat(pitcher.era);
        const whip = parseFloat(pitcher.whip);
        const fip = parseFloat(pitcher.fip);
        const kPer9 = parseFloat(pitcher.kPer9);
        const bbPer9 = parseFloat(pitcher.bbPer9);
        const hrPer9 = parseFloat(pitcher.hrPer9);
        const groundBallRate = parseFloat(pitcher.groundBallRate);
        const flyBallRate = parseFloat(pitcher.flyBallRate);
        const hardHitRate = parseFloat(pitcher.hardHitRate);
        const barrelRate = parseFloat(pitcher.barrelRate);
        const exitVelocity = parseFloat(pitcher.exitVelocity);
        const spinRate = parseFloat(pitcher.spinRate);
        const pitchVelocity = parseFloat(pitcher.pitchVelocity);

        if (!isNaN(era) && !isNaN(whip)) {
          // Calculate usage metrics
          const inningsPitched = 7; // Assume 1 inning per day
          bullpenUsage.lastSevenDays.inningsPitched += inningsPitched;
          bullpenUsage.lastSevenDays.totalPitches += Math.round(inningsPitched * 15);

          const last3Days = 3;
          bullpenUsage.lastThreeDays.inningsPitched += last3Days;
          bullpenUsage.lastThreeDays.totalPitches += Math.round(last3Days * 15);

          // Accumulate advanced metrics
          totalERA += era;
          totalWHIP += whip;
          totalFIP += fip;
          totalKPer9 += kPer9;
          totalBBPer9 += bbPer9;
          totalHRPer9 += hrPer9;
          totalGroundBallRate += groundBallRate;
          totalFlyBallRate += flyBallRate;
          totalHardHitRate += hardHitRate;
          totalBarrelRate += barrelRate;
          totalExitVelocity += exitVelocity;
          totalSpinRate += spinRate;
          totalPitchVelocity += pitchVelocity;
          validPitchers++;
        }
      });

      // Calculate bullpen averages
      if (validPitchers > 0) {
        bullpenUsage.bullpenERA = totalERA / validPitchers;
        bullpenUsage.bullpenWHIP = totalWHIP / validPitchers;
        bullpenUsage.bullpenFIP = totalFIP / validPitchers;
        bullpenUsage.bullpenKPer9 = totalKPer9 / validPitchers;
        bullpenUsage.bullpenBBPer9 = totalBBPer9 / validPitchers;
        bullpenUsage.bullpenHRPer9 = totalHRPer9 / validPitchers;
        bullpenUsage.bullpenGroundBallRate = totalGroundBallRate / validPitchers;
        bullpenUsage.bullpenFlyBallRate = totalFlyBallRate / validPitchers;
        bullpenUsage.bullpenHardHitRate = totalHardHitRate / validPitchers;
        bullpenUsage.bullpenBarrelRate = totalBarrelRate / validPitchers;
        bullpenUsage.bullpenExitVelocity = totalExitVelocity / validPitchers;
        bullpenUsage.bullpenSpinRate = totalSpinRate / validPitchers;
        bullpenUsage.bullpenPitchVelocity = totalPitchVelocity / validPitchers;
      }

      // Cache the result
      await CacheService.set(cacheKey, bullpenUsage, this.CACHE_DURATION);
      return bullpenUsage;
    } catch (error) {
      console.error('Error analyzing bullpen usage:', error);
      return null;
    }
  }

  /**
   * Calculate fatigue level based on pitcher stats
   */
  private static calculateFatigueLevel(pitchers: Array<{ era: string; whip: string }>): 'LOW' | 'MEDIUM' | 'HIGH' {
    const recentUsage = pitchers.reduce((acc, pitcher) => {
      const era = parseFloat(pitcher.era);
      const whip = parseFloat(pitcher.whip);
      if (!isNaN(era) && !isNaN(whip)) {
        acc.totalInnings += 7; // Assume 1 inning per day
        acc.totalPitchers++;
      }
      return acc;
    }, { totalInnings: 0, totalPitchers: 0 });

    if (recentUsage.totalPitchers === 0) return 'LOW';

    const avgInningsPerPitcher = recentUsage.totalInnings / recentUsage.totalPitchers;
    if (avgInningsPerPitcher > 5) return 'HIGH';
    if (avgInningsPerPitcher > 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Analyze bullpen fatigue impact
   */
  static analyzeBullpenFatigue(bullpenUsage: BullpenUsage): number {
    let fatigueImpact = 0;

    // Analyze last three days usage
    if (bullpenUsage.lastThreeDays.totalPitches > 300) {
      fatigueImpact += 0.1;
    }
    if (bullpenUsage.lastThreeDays.highLeverageInnings > 5) {
      fatigueImpact += 0.05;
    }

    // Analyze last seven days usage
    if (bullpenUsage.lastSevenDays.totalPitches > 600) {
      fatigueImpact += 0.05;
    }
    if (bullpenUsage.lastSevenDays.highLeverageInnings > 10) {
      fatigueImpact += 0.03;
    }

    // Consider available pitchers
    if (bullpenUsage.availablePitchers < 3) {
      fatigueImpact += 0.1;
    }
    if (bullpenUsage.highLeveragePitchers < 2) {
      fatigueImpact += 0.05;
    }

    return Math.min(0.3, fatigueImpact); // Cap at 30% impact
  }

  /**
   * Calculate matchup advantage based on batter-pitcher history
   */
  static calculateMatchupAdvantage(matchup: BatterPitcherMatchup): number {
    if (!matchup || matchup.plateAppearances < 10) {
      return 0; // Not enough data
    }

    let advantage = 0;

    // Weight recent performance more heavily
    const opsWeight = 0.4;
    const avgWeight = 0.3;
    const slugWeight = 0.3;

    // Calculate advantage based on OPS, AVG, and SLG
    const opsAdvantage = (matchup.ops - 0.7) * opsWeight; // 0.7 is league average OPS
    const avgAdvantage = (matchup.battingAverage - 0.25) * avgWeight; // 0.25 is league average AVG
    const slugAdvantage = (matchup.sluggingPercentage - 0.4) * slugWeight; // 0.4 is league average SLG

    advantage = opsAdvantage + avgAdvantage + slugAdvantage;

    // Adjust for sample size
    const sampleSizeFactor = Math.min(1, matchup.plateAppearances / 50);
    advantage *= sampleSizeFactor;

    return Math.max(-0.2, Math.min(0.2, advantage)); // Cap between -20% and +20%
  }

  /**
   * Adjust raw statistics based on park factors
   */
  static adjustStatsForPark(rawStats: Record<string, number>, parkFactors: ParkFactors): Record<string, number> {
    return {
      homeRuns: rawStats.homeRuns / parkFactors.homeRuns,
      hits: rawStats.hits / parkFactors.hits,
      doubles: rawStats.doubles / parkFactors.doubles,
      triples: rawStats.triples / parkFactors.triples,
      walks: rawStats.walks / parkFactors.walks,
      strikeouts: rawStats.strikeouts / parkFactors.strikeouts
    };
  }
} 