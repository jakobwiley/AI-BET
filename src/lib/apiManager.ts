import { SportType } from '../models/types.js';
import { NBAStatsService } from './nbaStatsApi.js';
import { NBAApiService } from './nbaApiService.js';
import { MLBStatsService } from './mlbStatsApi.js';
import { CacheService } from './cacheService.js';

/**
 * Defines the different types of sports data we might need
 */
export type DataType = 'teamStats' | 'h2h' | 'playerStats' | 'odds' | 'playerProps' | 'schedule';

/**
 * Provider interface to standardize API interactions
 */
export interface ApiProvider {
  getTeamStats?: (teamName: string) => Promise<any>;
  getH2HStats?: (team1: string, team2: string) => Promise<any>;
  getPlayerStats?: (playerId: string) => Promise<any>;
  getOdds?: (gameId: string) => Promise<any>;
  getPlayerProps?: (gameId: string) => Promise<any>;
  getSchedule?: (date?: string) => Promise<any>;
}

/**
 * Factory class to manage and provide the appropriate API providers
 */
export class ApiManager {
  private static instance: ApiManager;
  private cacheService: CacheService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }

  /**
   * Get the appropriate API provider based on sport and data type
   * 
   * @param sport The sport (NBA, MLB)
   * @param dataType The type of data needed
   * @returns The appropriate API provider
   */
  public getProvider(sport: SportType, dataType: DataType): ApiProvider {
    // Use environment variables to determine which provider to use
    const useNewNbaApi = process.env.NEXT_PUBLIC_USE_NEW_NBA_API === 'true';
    
    if (sport === 'NBA') {
      // For NBA data
      switch (dataType) {
        case 'teamStats':
        case 'h2h':
          // Use the new NBA API if enabled, otherwise fall back to the old one
          return useNewNbaApi ? NBAApiService : NBAStatsService;
          
        case 'odds':
          // Use OddsApi for odds data
          // TODO: return new OddsApiProvider();
          break;
          
        case 'playerProps':
          // Use PlayerPropsService for player props
          // TODO: return new PlayerPropsProvider();
          break;
          
        default:
          // Default to NBAStatsService for other data types
          return useNewNbaApi ? NBAApiService : NBAStatsService;
      }
    } else if (sport === 'MLB') {
      // For MLB data, always use MLBStatsService for now
      return MLBStatsService;
    }
    
    // Default fallback
    console.warn(`No provider found for ${sport} - ${dataType}, using default`);
    return sport === 'NBA' ? NBAStatsService : MLBStatsService;
  }
  
  /**
   * Get team stats with provider abstraction
   * 
   * @param sport The sport
   * @param teamName The team name
   * @returns Team stats
   */
  public async getTeamStats(sport: SportType, teamName: string): Promise<any> {
    const provider = this.getProvider(sport, 'teamStats');
    if (!provider.getTeamStats) {
      throw new Error(`Provider for ${sport} does not support team stats`);
    }
    
    const cacheKey = `team_stats:${sport}:${teamName}`;
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const result = await provider.getTeamStats(teamName);
      if (result) {
        await this.cacheService.set(cacheKey, result, 6 * 60 * 60); // 6 hours
      }
      return result;
    } catch (error) {
      console.error(`[ApiManager] Error getting ${sport} team stats for ${teamName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get head-to-head stats with provider abstraction
   * 
   * @param sport The sport
   * @param team1 First team name
   * @param team2 Second team name
   * @returns H2H stats
   */
  public async getH2HStats(sport: SportType, team1: string, team2: string): Promise<any> {
    const provider = this.getProvider(sport, 'h2h');
    if (!provider.getH2HStats) {
      throw new Error(`Provider for ${sport} does not support H2H stats`);
    }
    
    const teams = [team1, team2].sort();
    const cacheKey = `h2h_stats:${sport}:${teams[0]}:${teams[1]}`;
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const result = await provider.getH2HStats(team1, team2);
      if (result) {
        await this.cacheService.set(cacheKey, result, 6 * 60 * 60); // 6 hours
      }
      return result;
    } catch (error) {
      console.error(`[ApiManager] Error getting ${sport} H2H stats for ${team1} vs ${team2}:`, error);
      throw error;
    }
  }
} 