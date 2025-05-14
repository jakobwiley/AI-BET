import axios from 'axios';
import { TeamStats, H2HStats } from './predictionService.js';
import { CacheService } from './cacheService.js';
import { GameStatus } from '../models/types.js';

const NBA_API_BASE_URL = 'https://stats.nba.com/stats';
const FALLBACK_TO_BALLDONTLIE = process.env.USE_BALLDONTLIE_FALLBACK === 'true';
const BALLDONTLIE_BASE_URL = 'https://www.balldontlie.io/api/v1';
const CURRENT_NBA_SEASON = 2024;

interface NbaApiTeam {
  id: number;
  full_name: string;
  name: string;
  abbreviation: string;
  city: string;
  state: string;
  year_founded: number;
  conference: string;
  division: string;
}

interface BallDontLieTeam {
  id: number;
  full_name: string;
  name: string;
  city: string;
  conference: string;
  division: string;
  abbreviation: string;
}

interface BallDontLieResponse<T> {
  data: T[];
  meta: {
    total_pages: number;
    current_page: number;
    next_page: number;
    per_page: number;
    total_count: number;
  };
}

interface NbaTeamStats {
  teamSitesOnly: {
    teamName: string;
  };
  win: string;
  loss: string;
  winPct: string;
  homeWin: string;
  homeLoss: string;
  awayWin: string;
  awayLoss: string;
  lastTenWin: string;
  lastTenLoss: string;
  streak: string;
  pointsFor: string;
  pointsAgainst: string;
}

interface NbaStatsResponse {
  league: {
    standard: NbaTeamStats[];
  };
}

interface NbaGame {
  gameId: string;
  gameDate: string;
  status: {
    abstractGameState: string;
  };
  teams: {
    home: {
      team: {
        id: number;
      };
      score: number;
    };
    away: {
      team: {
        id: number;
      };
      score: number;
    };
  };
}

interface NbaScheduleResponse {
  dates: Array<{
    games: NbaGame[];
  }>;
}

interface GameResponse {
  data: Array<{
    id: number;
    status: string;
    home_team_score: number;
    visitor_team_score: number;
    season: number;
    period: number;
    home_team: {
      id: number;
      name: string;
    };
    visitor_team: {
      id: number;
      name: string;
    };
  }>;
  meta: {
    total_pages: number;
    current_page: number;
    next_page: number;
    per_page: number;
    total_count: number;
  };
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
          const bdlResponse = await axios.get<BallDontLieResponse<BallDontLieTeam>>(`${BALLDONTLIE_BASE_URL}/teams`);
          const bdlTeams: NbaApiTeam[] = bdlResponse.data.data.map((t: BallDontLieTeam) => ({
            id: t.id,
            full_name: t.full_name,
            name: t.name,
            abbreviation: t.abbreviation,
            city: t.city,
            state: '', // BallDontLie doesn't provide state
            year_founded: 0, // BallDontLie doesn't provide year_founded
            conference: t.conference,
            division: t.division
          }));
          this.cacheService.set(cacheKey, bdlTeams, 24 * 60 * 60); // Cache for 24 hours
          return bdlTeams;
        } catch (error) {
          console.error('[NBAApiService] Error fetching teams from BallDontLie:', error);
          return [];
        }
      }
      
      throw error;
    }
  }
  
  public static async getTeamStats(teamName: string): Promise<TeamStats | null> {
    try {
      const response = await axios.get<NbaStatsResponse>(`${NBA_API_BASE_URL}/standings/standard/${CURRENT_NBA_SEASON}`);
      const statsData = response.data.league.standard;
      if (!statsData || !Array.isArray(statsData)) {
        console.error('[NBAApiService] Invalid stats data format');
        return null;
      }

      const teamData = statsData.find(team => team.teamSitesOnly?.teamName?.toLowerCase() === teamName.toLowerCase());
      if (!teamData) {
        console.error(`[NBAApiService] Stats not found for team: ${teamName}`);
        return null;
      }

      // Convert string values to numbers
      const stats: TeamStats = {
        wins: parseInt(teamData.win),
        losses: parseInt(teamData.loss),
        homeWins: parseInt(teamData.homeWin),
        homeLosses: parseInt(teamData.homeLoss),
        awayWins: parseInt(teamData.awayWin),
        awayLosses: parseInt(teamData.awayLoss),
        pointsFor: parseInt(teamData.pointsFor),
        pointsAgainst: parseInt(teamData.pointsAgainst),
        lastTenGames: `${teamData.lastTenWin}-${teamData.lastTenLoss}`,
        streak: parseInt(teamData.streak),
        winPercentage: parseFloat(teamData.winPct),
        homeWinPercentage: parseInt(teamData.homeWin) / (parseInt(teamData.homeWin) + parseInt(teamData.homeLoss) || 1),
        awayWinPercentage: parseInt(teamData.awayWin) / (parseInt(teamData.awayWin) + parseInt(teamData.awayLoss) || 1),
        lastTenWins: parseInt(teamData.lastTenWin)
      };

      return stats;
    } catch (error) {
      console.error(`[NBAApiService] Error fetching team stats for ${teamName}:`, error);
      return null;
    }
  }
  
  private static async getTeamStatsFromBallDontLie(teamName: string, teamId: number): Promise<TeamStats | null> {
    try {
      const season = new Date().getFullYear() - (new Date().getMonth() < 9 ? 1 : 0);
      console.log(`[NBAApiService] Fetching BDL games for ${teamName} (ID: ${teamId}) for season ${season}`);
      
      // Fetch games to calculate W/L record
      const response = await axios.get<GameResponse>(`${BALLDONTLIE_BASE_URL}/games`, {
        params: {
          seasons: [season],
          team_ids: [teamId],
          per_page: 100
        }
      });
      
      const games = response.data.data.filter(g => g.status === 'Final');
      if (games.length === 0) {
        console.warn(`[NBAApiService] No completed games found for ${teamName} in season ${season}`);
        return {
          wins: 0,
          losses: 0,
          homeWins: 0,
          homeLosses: 0,
          awayWins: 0,
          awayLosses: 0,
          lastTenWins: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          lastTenGames: '0-0',
          streak: 0,
          winPercentage: 0,
          homeWinPercentage: 0,
          awayWinPercentage: 0
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
        pointsFor: totalPointsScored,
        pointsAgainst: totalPointsAllowed,
        lastTenGames: `${lastTenWins}-${10 - lastTenWins}`,
        streak: 0, // TODO: Calculate actual streak
        winPercentage: wins / (wins + losses || 1),
        homeWinPercentage: homeWins / (homeWins + homeLosses || 1),
        awayWinPercentage: awayWins / (awayWins + awayLosses || 1)
      };
    } catch (error) {
      console.error(`[NBAApiService] Error in BallDontLie fallback for ${teamName}:`, error);
      return null;
    }
  }
  
  public static async getH2HStats(homeTeamName: string, awayTeamName: string): Promise<H2HStats | null> {
    try {
      interface ScheduleResponse {
        dates: Array<{
          games: Array<{
            gameId: string;
            gameDate: string;
            status: {
              abstractGameState: string;
            };
            teams: {
              home: {
                team: {
                  id: number;
                };
                score: number;
              };
              away: {
                team: {
                  id: number;
                };
                score: number;
              };
            };
          }>;
        }>;
      }

      const response = await axios.get(`${NBA_API_BASE_URL}/schedule`, {
        params: { teamId: homeTeamName, opponentId: awayTeamName, season: CURRENT_NBA_SEASON }
      });

      const scheduleData = response.data as ScheduleResponse;
      const h2hGames = scheduleData.dates.flatMap(date => date.games).filter(game => game.status.abstractGameState === 'Final');
      if (h2hGames.length === 0) {
        return {
          totalGames: 0,
          homeTeamWins: 0,
          awayTeamWins: 0,
          averagePointsDiff: 0,
          lastMeetingDate: '',
          lastMeetingResult: 'No previous meetings'
        };
      }

      const stats: H2HStats = {
        totalGames: h2hGames.length,
        homeTeamWins: 0,
        awayTeamWins: 0,
        averagePointsDiff: 0,
        lastMeetingDate: new Date(h2hGames[h2hGames.length - 1].gameDate).toISOString(),
        lastMeetingResult: ''
      };

      let totalPointsDiff = 0;
      h2hGames.forEach((game, index) => {
        const homeScore = game.teams.home.score;
        const awayScore = game.teams.away.score;
        
        if (homeScore > awayScore) {
          stats.homeTeamWins++;
        } else {
          stats.awayTeamWins++;
        }
        
        totalPointsDiff += (homeScore - awayScore);
        
        if (index === h2hGames.length - 1) {
          stats.lastMeetingResult = `${homeTeamName} ${homeScore} - ${awayTeamName} ${awayScore}`;
        }
      });
      
      stats.averagePointsDiff = totalPointsDiff / stats.totalGames;
      return stats;
    } catch (error) {
      console.error(`[NBAApiService] Error fetching H2H stats for ${homeTeamName} vs ${awayTeamName}:`, error);
      return null;
    }
  }
} 