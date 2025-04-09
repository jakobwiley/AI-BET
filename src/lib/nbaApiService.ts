import axios from 'axios';
import { TeamStats, H2HStats } from './predictionService';
import { CacheService } from './cacheService';

const NBA_API_BASE_URL = process.env.NBA_API_URL || 'http://localhost:5000';
const FALLBACK_TO_BALLDONTLIE = process.env.USE_BALLDONTLIE_FALLBACK === 'true';
const BALLDONTLIE_BASE_URL = 'https://www.balldontlie.io/api/v1';

interface NbaApiTeam {
  id: number;
  full_name: string;
  name: string;
  abbreviation: string;
  city: string;
  state: string;
  year_founded: number;
}

export class NBAApiService {
  private static teamIdMap: Map<string, number> | null = null;
  private static teamFetchPromise: Promise<void> | null = null;
  private static cacheService = CacheService.getInstance();

  private static async initializeTeamIdMap(): Promise<void> {
    if (this.teamIdMap) return;
    if (this.teamFetchPromise) return this.teamFetchPromise;

    console.log('[NBAApiService] Initializing team ID map...');
    this.teamFetchPromise = this.fetchTeams()
      .then(teams => {
        const map = new Map<string, number>();
        teams.forEach(team => {
          // Store lowercase versions for case-insensitive lookup
          map.set(team.full_name.toLowerCase(), team.id);
          map.set(team.name.toLowerCase(), team.id);
          
          // Add variations for common team names
          if (team.full_name === 'LA Clippers') {
            map.set('los angeles clippers', team.id);
          }
        });
        this.teamIdMap = map;
        console.log(`[NBAApiService] Team ID Map Initialized with ${this.teamIdMap.size} entries.`);
      })
      .catch(error => {
        console.error('[NBAApiService] Failed to initialize team ID map:', error);
        this.teamIdMap = new Map(); // Initialize empty map on error
      })
      .finally(() => {
        this.teamFetchPromise = null;
      });
    
    return this.teamFetchPromise;
  }
  
  private static async getTeamId(teamName: string): Promise<number | null> {
    await this.initializeTeamIdMap();
    const normalizedName = teamName.toLowerCase(); // Normalize input
    const teamId = this.teamIdMap?.get(normalizedName);
    if (teamId === undefined) {
      console.warn(`[NBAApiService] Team ID not found for: "${teamName}" (Normalized: "${normalizedName}")`);
      return null;
    }
    return teamId;
  }
  
  private static async fetchTeams(): Promise<NbaApiTeam[]> {
    const cacheKey = 'nba_api_teams';
    const cachedTeams = this.cacheService.get<NbaApiTeam[]>(cacheKey);
    if (cachedTeams) {
      return cachedTeams;
    }
    
    try {
      // Try the NBA API first
      const response = await axios.get<NbaApiTeam[]>(`${NBA_API_BASE_URL}/teams`);
      const teams = response.data;
      this.cacheService.set(cacheKey, teams, 24 * 60 * 60); // Cache for 24 hours
      return teams;
    } catch (error) {
      console.error('[NBAApiService] Failed to fetch teams from NBA API:', error);
      
      // Fall back to BallDontLie if enabled
      if (FALLBACK_TO_BALLDONTLIE) {
        try {
          console.log('[NBAApiService] Falling back to BallDontLie for teams');
          const bdlResponse = await axios.get(`${BALLDONTLIE_BASE_URL}/teams`);
          const bdlTeams = bdlResponse.data.data.map((t: any) => ({
            id: t.id,
            full_name: t.full_name,
            name: t.name,
            abbreviation: t.abbreviation,
            city: t.city,
            state: '', // BallDontLie doesn't provide state
            year_founded: 0 // BallDontLie doesn't provide year_founded
          }));
          this.cacheService.set(cacheKey, bdlTeams, 24 * 60 * 60); // Cache for 24 hours
          return bdlTeams;
        } catch (bdlError) {
          console.error('[NBAApiService] Fallback to BallDontLie also failed:', bdlError);
          throw bdlError;
        }
      }
      
      throw error;
    }
  }
  
  public static async getTeamStats(teamName: string): Promise<TeamStats | null> {
    const teamId = await this.getTeamId(teamName);
    if (!teamId) {
      console.error(`[NBAApiService] Cannot fetch stats for ${teamName} due to missing ID.`);
      return null;
    }
    
    const cacheKey = `nba_team_stats_${teamId}`;
    const cachedStats = this.cacheService.get<TeamStats>(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }
    
    try {
      // Fetch team stats from our NBA API
      const response = await axios.get(`${NBA_API_BASE_URL}/teams/${teamId}/stats`);
      const statsData = response.data;
      
      // Process the raw stats data into our TeamStats interface
      const basicData = statsData.basic.resultSets[0];
      const advancedData = statsData.advanced.resultSets[0];
      
      // Find the headers and the row data
      const headers = basicData.headers;
      const row = basicData.rowSet[0];
      
      // Map header names to indices
      const headerMap: Record<string, number> = {};
      headers.forEach((header: string, index: number) => {
        headerMap[header] = index;
      });
      
      // Extract advanced metrics
      const advHeaderMap: Record<string, number> = {};
      advancedData.headers.forEach((header: string, index: number) => {
        advHeaderMap[header] = index;
      });
      const advRow = advancedData.rowSet[0];
      
      // Calculate derived fields
      const wins = row[headerMap.W] || 0;
      const losses = row[headerMap.L] || 0;
      const homeWins = row[headerMap.HOME_WINS] || 0;
      const homeLosses = row[headerMap.HOME_LOSSES] || 0;
      const awayWins = row[headerMap.ROAD_WINS] || 0;
      const awayLosses = row[headerMap.ROAD_LOSSES] || 0;
      // NBA API doesn't directly provide last 10, we'd need to compute it
      const lastTenWins = Math.floor(Math.random() * 11); // Placeholder - would need separate API call
      
      // Build TeamStats object
      const teamStats: TeamStats = {
        wins,
        losses,
        homeWins,
        homeLosses,
        awayWins,
        awayLosses,
        lastTenWins,
        avgPointsScored: row[headerMap.PTS] || 0,
        avgPointsAllowed: row[headerMap.OPP_PTS] || 0,
        pace: advRow ? advRow[advHeaderMap.PACE] : undefined,
        offensiveRating: advRow ? advRow[advHeaderMap.OFF_RATING] : undefined,
        defensiveRating: advRow ? advRow[advHeaderMap.DEF_RATING] : undefined
      };
      
      this.cacheService.set(cacheKey, teamStats, 6 * 60 * 60); // Cache for 6 hours
      return teamStats;
    } catch (error) {
      console.error(`[NBAApiService] Error fetching stats for ${teamName}:`, error);
      
      // Fall back to BallDontLie if enabled
      if (FALLBACK_TO_BALLDONTLIE) {
        try {
          console.log(`[NBAApiService] Falling back to BallDontLie for ${teamName} stats`);
          // Call the legacy implementation or a simplified version of it
          return this.getTeamStatsFromBallDontLie(teamName, teamId);
        } catch (bdlError) {
          console.error(`[NBAApiService] Fallback to BallDontLie also failed for ${teamName}:`, bdlError);
          return null;
        }
      }
      
      return null;
    }
  }
  
  private static async getTeamStatsFromBallDontLie(teamName: string, teamId: number): Promise<TeamStats | null> {
    try {
      const season = new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0);
      console.log(`[NBAApiService] Fetching BDL games for ${teamName} (ID: ${teamId}) for season ${season}`);
      
      // Fetch games to calculate W/L record
      const response = await axios.get(`${BALLDONTLIE_BASE_URL}/games`, {
        params: {
          'seasons[]': [season],
          'team_ids[]': [teamId],
          per_page: 100,
          postseason: false
        }
      });
      
      const games = response.data.data.filter((g: any) => g.status === 'Final');
      if (games.length === 0) {
        console.warn(`[NBAApiService] No completed games found for ${teamName} in season ${season}`);
        return {
          wins: 0, losses: 0, homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0, lastTenWins: 0
        };
      }
      
      // Calculate stats from games
      let wins = 0, losses = 0, homeWins = 0, homeLosses = 0, awayWins = 0, awayLosses = 0;
      let totalPointsScored = 0, totalPointsAllowed = 0;
      
      games.forEach((game: any) => {
        const isHomeTeam = game.home_team.id === teamId;
        const teamScore = isHomeTeam ? game.home_team_score : game.visitor_team_score;
        const opponentScore = isHomeTeam ? game.visitor_team_score : game.home_team_score;
        
        if (teamScore > opponentScore) {
          wins++;
          if (isHomeTeam) homeWins++; else awayWins++;
        } else {
          losses++;
          if (isHomeTeam) homeLosses++; else awayLosses++;
        }
        
        totalPointsScored += teamScore;
        totalPointsAllowed += opponentScore;
      });
      
      // Calculate last 10 wins
      const lastTenGames = games.slice(-10);
      const lastTenWins = lastTenGames.reduce((w: number, game: any) => {
        const isHomeTeam = game.home_team.id === teamId;
        const teamScore = isHomeTeam ? game.home_team_score : game.visitor_team_score;
        const opponentScore = isHomeTeam ? game.visitor_team_score : game.home_team_score;
        return teamScore > opponentScore ? w + 1 : w;
      }, 0);
      
      return {
        wins,
        losses,
        homeWins,
        homeLosses,
        awayWins,
        awayLosses,
        lastTenWins,
        avgPointsScored: totalPointsScored / games.length,
        avgPointsAllowed: totalPointsAllowed / games.length
      };
    } catch (error) {
      console.error(`[NBAApiService] Error in BallDontLie fallback for ${teamName}:`, error);
      return null;
    }
  }
  
  public static async getH2HStats(team1Name: string, team2Name: string): Promise<H2HStats | null> {
    // The NBA API doesn't have a direct H2H endpoint, we'd need to calculate this manually
    // This is a placeholder implementation
    console.warn(`[NBAApiService] getH2HStats is not fully implemented - returning placeholder data.`);
    return {
      totalGames: 0,
      homeTeamWins: 0,
      awayTeamWins: 0
    };
  }
} 