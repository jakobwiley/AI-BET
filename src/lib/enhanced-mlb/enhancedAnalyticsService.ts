import { MLBStatsService } from '../mlbStatsApi.js';
import { CacheService } from '../cacheService.js';
import type { MLBPlayerStats } from '../mlbStatsApi.js';
import type { TeamStats } from '../predictionService.js';

export interface SituationalStats {
  home: {
    avg: number;
    ops: number;
    wOBA: number;
    hardHitRate: number;
    barrelRate: number;
  };
  away: {
    avg: number;
    ops: number;
    wOBA: number;
    hardHitRate: number;
    barrelRate: number;
  };
  day: {
    avg: number;
    ops: number;
    wOBA: number;
    hardHitRate: number;
    barrelRate: number;
  };
  night: {
    avg: number;
    ops: number;
    wOBA: number;
    hardHitRate: number;
    barrelRate: number;
  };
}

export interface BullpenUsage {
  last7Days: {
    inningsPitched: number;
    era: number;
    whip: number;
    strikeoutRate: number;
    walkRate: number;
    pitchCount: number;
  };
  last30Days: {
    inningsPitched: number;
    era: number;
    whip: number;
    strikeoutRate: number;
    walkRate: number;
    pitchCount: number;
  };
  restDays: {
    days0: number; // Pitched yesterday
    days1: number; // Pitched 2 days ago
    days2: number; // Pitched 3 days ago
    days3Plus: number; // Pitched 4+ days ago
  };
}

export interface BatterPitcherMatchup {
  plateAppearances: number;
  hits: number;
  avg: number;
  ops: number;
  wOBA: number;
  hardHitRate: number;
  barrelRate: number;
  strikeoutRate: number;
  walkRate: number;
  homeRuns: number;
  rbis: number;
}

export interface WeatherImpact {
  temperature: {
    cold: { // < 60°F
      avg: number;
      ops: number;
      wOBA: number;
    };
    moderate: { // 60-80°F
      avg: number;
      ops: number;
      wOBA: number;
    };
    hot: { // > 80°F
      avg: number;
      ops: number;
      wOBA: number;
    };
  };
  wind: {
    calm: { // < 8 mph
      avg: number;
      ops: number;
      wOBA: number;
    };
    moderate: { // 8-15 mph
      avg: number;
      ops: number;
      wOBA: number;
    };
    strong: { // > 15 mph
      avg: number;
      ops: number;
      wOBA: number;
    };
  };
}

export class EnhancedAnalyticsService {
  private static readonly CACHE_TTL = 3600; // 1 hour in seconds

  private static isSituationalStats(data: any): data is SituationalStats {
    return data 
      && typeof data === 'object'
      && 'home' in data && 'away' in data && 'day' in data && 'night' in data
      && typeof data.home === 'object' && typeof data.away === 'object'
      && typeof data.day === 'object' && typeof data.night === 'object';
  }

  private static isBullpenUsage(data: any): data is BullpenUsage {
    return data 
      && typeof data === 'object'
      && 'last7Days' in data && 'last30Days' in data && 'restDays' in data
      && typeof data.last7Days === 'object' && typeof data.last30Days === 'object'
      && typeof data.restDays === 'object';
  }

  private static isBatterPitcherMatchup(data: any): data is BatterPitcherMatchup {
    return data 
      && typeof data === 'object'
      && 'plateAppearances' in data && 'hits' in data && 'avg' in data
      && 'ops' in data && 'wOBA' in data;
  }

  private static isWeatherImpact(data: any): data is WeatherImpact {
    return data 
      && typeof data === 'object'
      && 'temperature' in data && 'wind' in data
      && typeof data.temperature === 'object' && typeof data.wind === 'object';
  }

  static async getSituationalStats(teamId: string): Promise<SituationalStats | null> {
    const cacheKey = `enhanced_situational_stats_${teamId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached && this.isSituationalStats(cached)) return cached;

    try {
      const rawStats = await MLBStatsService.getSituationalStats(teamId);
      if (!rawStats) return null;

      const stats = this.transformSituationalStats(rawStats);
      await CacheService.set(cacheKey, stats, this.CACHE_TTL);
      return stats;
    } catch (error) {
      console.error('Error fetching situational stats:', error);
      return null;
    }
  }

  static async getBullpenUsage(teamId: string): Promise<BullpenUsage | null> {
    const cacheKey = `enhanced_bullpen_usage_${teamId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached && this.isBullpenUsage(cached)) return cached;

    try {
      const rawStats = await MLBStatsService.getBullpenUsage(teamId);
      if (!rawStats) return null;

      const stats = this.transformBullpenUsage(rawStats);
      await CacheService.set(cacheKey, stats, this.CACHE_TTL);
      return stats;
    } catch (error) {
      console.error('Error fetching bullpen usage:', error);
      return null;
    }
  }

  static async getBatterPitcherMatchup(batterId: number, pitcherId: number): Promise<BatterPitcherMatchup | null> {
    const cacheKey = `enhanced_batter_pitcher_${batterId}_${pitcherId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached && this.isBatterPitcherMatchup(cached)) return cached;

    try {
      const rawStats = await MLBStatsService.getBatterPitcherMatchup(batterId, pitcherId);
      if (!rawStats) return null;

      const stats = this.transformBatterPitcherMatchup(rawStats);
      await CacheService.set(cacheKey, stats, this.CACHE_TTL);
      return stats;
    } catch (error) {
      console.error('Error fetching batter-pitcher matchup:', error);
      return null;
    }
  }

  static async getWeatherImpact(teamId: string): Promise<WeatherImpact | null> {
    const cacheKey = `enhanced_weather_impact_${teamId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached && this.isWeatherImpact(cached)) return cached;

    try {
      const rawStats = await MLBStatsService.getWeatherImpact(teamId);
      if (!rawStats) return null;

      const stats = this.transformWeatherImpact(rawStats);
      await CacheService.set(cacheKey, stats, this.CACHE_TTL);
      return stats;
    } catch (error) {
      console.error('Error fetching weather impact:', error);
      return null;
    }
  }

  private static transformSituationalStats(rawStats: any): SituationalStats {
    const defaultStats = {
      avg: 0,
      ops: 0,
      wOBA: 0,
      hardHitRate: 0,
      barrelRate: 0
    };

    return {
      home: { ...defaultStats, ...(rawStats?.home || {}) } as typeof defaultStats,
      away: { ...defaultStats, ...(rawStats?.away || {}) } as typeof defaultStats,
      day: { ...defaultStats, ...(rawStats?.day || {}) } as typeof defaultStats,
      night: { ...defaultStats, ...(rawStats?.night || {}) } as typeof defaultStats
    };
  }

  private static transformBullpenUsage(rawStats: any): BullpenUsage {
    const defaultPeriodStats = {
      inningsPitched: 0,
      era: 0,
      whip: 0,
      strikeoutRate: 0,
      walkRate: 0,
      pitchCount: 0
    };

    const defaultRestDays = {
      days0: 0,
      days1: 0,
      days2: 0,
      days3Plus: 0
    };

    return {
      last7Days: { ...defaultPeriodStats, ...(rawStats?.last7Days || {}) } as typeof defaultPeriodStats,
      last30Days: { ...defaultPeriodStats, ...(rawStats?.last30Days || {}) } as typeof defaultPeriodStats,
      restDays: { ...defaultRestDays, ...(rawStats?.restDays || {}) } as typeof defaultRestDays
    };
  }

  private static transformBatterPitcherMatchup(rawStats: any): BatterPitcherMatchup {
    const defaultStats = {
      plateAppearances: 0,
      hits: 0,
      avg: 0,
      ops: 0,
      wOBA: 0,
      hardHitRate: 0,
      barrelRate: 0,
      strikeoutRate: 0,
      walkRate: 0,
      homeRuns: 0,
      rbis: 0
    };

    return { ...defaultStats, ...(rawStats || {}) } as BatterPitcherMatchup;
  }

  private static transformWeatherImpact(rawStats: any): WeatherImpact {
    const defaultConditionStats = {
      avg: 0,
      ops: 0,
      wOBA: 0
    };

    return {
      temperature: {
        cold: { ...defaultConditionStats, ...(rawStats?.temperature?.cold || {}) } as typeof defaultConditionStats,
        moderate: { ...defaultConditionStats, ...(rawStats?.temperature?.moderate || {}) } as typeof defaultConditionStats,
        hot: { ...defaultConditionStats, ...(rawStats?.temperature?.hot || {}) } as typeof defaultConditionStats
      },
      wind: {
        calm: { ...defaultConditionStats, ...(rawStats?.wind?.calm || {}) } as typeof defaultConditionStats,
        moderate: { ...defaultConditionStats, ...(rawStats?.wind?.moderate || {}) } as typeof defaultConditionStats,
        strong: { ...defaultConditionStats, ...(rawStats?.wind?.strong || {}) } as typeof defaultConditionStats
      }
    };
  }
} 