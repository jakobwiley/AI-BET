import axios from 'axios';
import { Game, SportType } from '@/models/types';

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports';


export class ESPNApiService {
  static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      console.log(`[ESPNApi] Fetching ${sport} games from ESPN API`);
      
      // Create date parameters for today and the next 5 days
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 5);
      
      // Format dates as YYYYMMDD for ESPN API
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        // Month is 0-indexed, so add 1 and pad with 0 if needed
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };
      
      const dateParam = `${formatDate(today)}-${formatDate(endDate)}`;
      console.log(`[ESPNApi] Using date range: ${dateParam}`);
      
      // Use axios instead of fetch to handle CORS issues better
      const response = await axios.get(`${ESPN_API_BASE}/${sport.toLowerCase()}/scoreboard`, {
        params: {
          dates: dateParam,
          limit: 100
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // Add timeout to prevent hanging requests
        timeout: 15000,
      });

      console.log(`[ESPNApi] Received response from ESPN API for ${sport}`);
      
      const data = response.data;
      const games = data.events || [];

      console.log(`[ESPNApi] Found ${games.length} games for ${sport}`);

      return games.map((game: any) => {
        try {
          const homeTeam = game.competitions[0].competitors.find((team: any) => team.homeAway === 'home');
          const awayTeam = game.competitions[0].competitors.find((team: any) => team.homeAway === 'away');

          // Ensure we have valid team data
          if (!homeTeam || !awayTeam) {
            console.warn(`[ESPNApi] Missing team data for game ${game.id}`);
            return null;
          }

          // Parse the game date
          const gameDate = new Date(game.date);
          if (isNaN(gameDate.getTime())) {
            console.warn(`[ESPNApi] Invalid game date for game ${game.id}: ${game.date}`);
            return null;
          }

          // Log the game details to help with debugging
          console.log(`[ESPNApi] Game: ${awayTeam.team.name} @ ${homeTeam.team.name}, Date: ${gameDate.toLocaleString()}`);

          return {
            id: game.id,
            sport,
            gameDate: gameDate.toISOString(),
            status: game.status.type.name,
            homeTeamName: homeTeam.team.name,
            awayTeamName: awayTeam.team.name,
            homeTeamLogo: homeTeam.team.logo || this.getTeamLogoUrl(sport, homeTeam.team.id),
            awayTeamLogo: awayTeam.team.logo || this.getTeamLogoUrl(sport, awayTeam.team.id),
            homeTeamScore: homeTeam.score ? parseInt(homeTeam.score) : undefined,
            awayTeamScore: awayTeam.score ? parseInt(awayTeam.score) : undefined,
            homeTeamId: homeTeam.team.id,
            awayTeamId: awayTeam.team.id
          };
        } catch (error) {
          console.error(`[ESPNApi] Error processing game ${game.id}:`, error);
          return null;
        }
      }).filter((game: Game | null): game is Game => game !== null);
    } catch (error: any) {
      console.error(`[ESPNApi] Error fetching ${sport} games:`, error);
      
      if (axios.isAxiosError(error)) {
        console.error(`[ESPNApi] Axios error details:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }
      
      // Instead of using mock data, throw the error to be handled by the caller
      throw new Error(`Failed to fetch ${sport} games from ESPN API: ${error.message || 'Unknown error'}`);
    }
  }

  static getTeamLogoUrl(sport: SportType, teamId: string): string {
    return `https://a.espncdn.com/i/teamlogos/${sport.toLowerCase()}/500/${teamId}.png`;
  }
} 