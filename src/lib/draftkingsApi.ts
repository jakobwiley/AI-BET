import { Game, SportType } from '@/models/types';
import axios from 'axios';

interface DraftKingsEvent {
  eventId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  startDate: string;
  eventStatus: string;
  homeTeamSpread?: number;
  homeTeamSpreadOdds?: number;
  awayTeamSpread?: number;
  awayTeamSpreadOdds?: number;
  overUnder?: number;
  overOdds?: number;
  underOdds?: number;
  homeTeamMoneyLine?: number;
  awayTeamMoneyLine?: number;
}

interface DraftKingsResponse {
  events: DraftKingsEvent[];
}

export class DraftKingsApiService {
  private static instance: DraftKingsApiService | null = null;
  private static readonly API_HOST = 'https://sportsbook.draftkings.com';
  private static readonly SPORT_MAPPING: Record<SportType, string> = {
    'NBA': 'basketball/nba',
    'MLB': 'baseball/mlb'
  };

  private constructor() {}

  public static getInstance(): DraftKingsApiService {
    if (!DraftKingsApiService.instance) {
      DraftKingsApiService.instance = new DraftKingsApiService();
    }
    return DraftKingsApiService.instance;
  }

  private static async apiRequest<T>(endpoint: string): Promise<T> {
    try {
      const url = `${DraftKingsApiService.API_HOST}${endpoint}`;
      console.log('[DraftKingsAPI] Making request to:', url);
      
      const response = await axios.get<T>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Origin': 'https://sportsbook.draftkings.com',
          'Referer': 'https://sportsbook.draftkings.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('[DraftKingsAPI] Response status:', response.status);
      console.log('[DraftKingsAPI] Response data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      console.error('[DraftKingsAPI] Error:', error);
      throw error;
    }
  }

  public static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      const sportPath = DraftKingsApiService.SPORT_MAPPING[sport];
      const response = await DraftKingsApiService.apiRequest<DraftKingsResponse>(`/api/odds/v1/leagues/${sportPath}/events/live`);

      // Transform DraftKings response to Game objects
      const games: Game[] = response.events.map((event) => ({
        id: event.eventId.toString(),
        sport,
        homeTeamId: event.homeTeamId.toString(),
        awayTeamId: event.awayTeamId.toString(),
        homeTeamName: event.homeTeamName,
        awayTeamName: event.awayTeamName,
        gameDate: new Date(event.startDate).toISOString().split('T')[0],
        startTime: new Date(event.startDate).toISOString(),
        status: event.eventStatus.toLowerCase(),
        odds: {
          spread: {
            home: { line: event.homeTeamSpread || 0, odds: event.homeTeamSpreadOdds || -110 },
            away: { line: event.awayTeamSpread || 0, odds: event.awayTeamSpreadOdds || -110 }
          },
          total: {
            over: { line: event.overUnder || 0, odds: event.overOdds || -110 },
            under: { line: event.overUnder || 0, odds: event.underOdds || -110 }
          },
          moneyline: {
            home: event.homeTeamMoneyLine || -110,
            away: event.awayTeamMoneyLine || -110
          }
        },
        predictions: []
      }));

      console.log(`[DraftKingsAPI] Transformed ${games.length} ${sport} games`);
      return games;
    } catch (error) {
      console.error(`[DraftKingsAPI] Error fetching ${sport} games:`, error);
      return [];
    }
  }
} 