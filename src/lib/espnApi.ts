import axios from 'axios';
import { Game, SportType } from '@/models/types';

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

export class ESPNApiService {
  static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      const endpoint = sport === 'NBA' 
        ? `${ESPN_API_BASE}/basketball/nba/scoreboard`
        : `${ESPN_API_BASE}/baseball/mlb/scoreboard`;

      console.log(`[ESPNApi] Fetching ${sport} games from ${endpoint}`);
      const response = await axios.get(endpoint);
      console.log(`[ESPNApi] Received response for ${sport} games:`, response.data);

      const games = response.data.events.map((event: any) => ({
        id: event.id,
        sport,
        homeTeamId: event.competitions[0].competitors.find((c: any) => c.homeAway === 'home')?.team.abbreviation.toLowerCase() || '',
        awayTeamId: event.competitions[0].competitors.find((c: any) => c.homeAway === 'away')?.team.abbreviation.toLowerCase() || '',
        homeTeamName: event.competitions[0].competitors.find((c: any) => c.homeAway === 'home')?.team.name || '',
        awayTeamName: event.competitions[0].competitors.find((c: any) => c.homeAway === 'away')?.team.name || '',
        startTime: event.date,
        gameDate: event.date,
        status: event.status.type.state.toUpperCase(),
        spread: { home: 0, away: 0 } // We're not using odds for now
      }));

      console.log(`[ESPNApi] Transformed ${games.length} ${sport} games`);
      return games;
    } catch (error) {
      console.error(`[ESPNApi] Error fetching ${sport} games:`, error);
      return [];
    }
  }

  static getTeamLogoUrl(sport: SportType, teamId: string): string {
    return `https://a.espncdn.com/i/teamlogos/${sport.toLowerCase()}/${teamId}.png`;
  }
} 