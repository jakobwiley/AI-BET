import { Game, SportType } from '@/models/types';
import axios from 'axios';

interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

export class OddsApiService {
  private static readonly API_KEY = process.env.THE_ODDS_API_KEY;
  private static readonly API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
  private static readonly SPORT_MAPPING: Record<SportType, string> = {
    'NBA': 'basketball_nba',
    'MLB': 'baseball_mlb'
  };

  private static async apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.API_KEY) {
      console.error('[OddsAPI] API key is not set');
      throw new Error('API key is not configured');
    }

    try {
      const url = `${this.API_HOST}${endpoint}`;
      console.log('[OddsAPI] Making request to:', url);
      
      const queryParams = {
        apiKey: this.API_KEY,
        ...params
      };
      
      console.log('[OddsAPI] Using API key:', this.API_KEY ? `${this.API_KEY.slice(0, 4)}...${this.API_KEY.slice(-4)}` : 'Not set');
      console.log('[OddsAPI] Query params:', { ...queryParams, apiKey: '[REDACTED]' });
      
      const response = await axios.get<T>(url, { params: queryParams });
      console.log('[OddsAPI] Response status:', response.status);
      console.log('[OddsAPI] Response headers:', response.headers);
      console.log('[OddsAPI] Response data:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[OddsAPI] Axios error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
        throw new Error(`API request failed: ${error.response?.data?.message || error.message}`);
      }
      console.error('[OddsAPI] Non-Axios error:', error);
      throw error;
    }
  }

  public static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    if (!sport) {
      console.error('[OddsAPI] Sport parameter is required');
      return [];
    }

    if (!this.SPORT_MAPPING[sport]) {
      console.error(`[OddsAPI] Unsupported sport: ${sport}`);
      return [];
    }

    try {
      const sportKey = this.SPORT_MAPPING[sport];
      console.log(`[OddsAPI] Fetching ${sport} events from Odds API`);
      
      const events = await this.apiRequest<OddsEvent[]>(`/sports/${sportKey}/odds`, {
        dateFormat: 'iso',
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american'
      });
      
      if (!Array.isArray(events)) {
        console.error('[OddsAPI] Invalid response format - expected array:', events);
        return [];
      }

      console.log(`[OddsAPI] Found ${events.length} ${sport} events:`, 
        events.map(e => ({
          teams: `${e.home_team} vs ${e.away_team}`,
          time: new Date(e.commence_time).toLocaleString(),
          hasBookmaker: e.bookmakers?.some(b => b.key === 'draftkings')
        }))
      );

      // Transform Odds API response to Game objects
      const games: Game[] = events.map((event) => {
        const bookmaker = event.bookmakers?.find(b => b.key === 'draftkings');
        
        if (!bookmaker) {
          console.log(`[OddsAPI] No DraftKings odds for game: ${event.home_team} vs ${event.away_team}`);
        }
        
        const h2hMarket = bookmaker?.markets.find((m: any) => m.key === 'h2h');
        const spreadsMarket = bookmaker?.markets.find((m: any) => m.key === 'spreads');
        const totalsMarket = bookmaker?.markets.find((m: any) => m.key === 'totals');

        const homeSpread = spreadsMarket?.outcomes.find((o: any) => o.name === event.home_team);
        const awaySpread = spreadsMarket?.outcomes.find((o: any) => o.name === event.away_team);
        const overTotal = totalsMarket?.outcomes.find((o: any) => o.name === 'Over');
        const underTotal = totalsMarket?.outcomes.find((o: any) => o.name === 'Under');
        const homeMoneyline = h2hMarket?.outcomes.find((o: any) => o.name === event.home_team);
        const awayMoneyline = h2hMarket?.outcomes.find((o: any) => o.name === event.away_team);

        // Convert UTC time to local time for display
        const gameDate = new Date(event.commence_time);
        const localGameDate = new Date(gameDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));

        const odds = {
          spread: {
            home: {
              line: homeSpread?.point || 0,
              odds: homeSpread?.price || -110
            },
            away: {
              line: awaySpread?.point || 0,
              odds: awaySpread?.price || -110
            }
          },
          total: {
            over: {
              line: overTotal?.point || 0,
              odds: overTotal?.price || -110
            },
            under: {
              line: underTotal?.point || 0,
              odds: underTotal?.price || -110
            }
          },
          moneyline: {
            home: homeMoneyline?.price || -110,
            away: awayMoneyline?.price || -110
          }
        };

        return {
          id: event.id,
          sport,
          homeTeamId: event.home_team.toLowerCase().replace(/\s+/g, '-'),
          awayTeamId: event.away_team.toLowerCase().replace(/\s+/g, '-'),
          homeTeamName: event.home_team,
          awayTeamName: event.away_team,
          gameDate: localGameDate.toISOString(),
          startTime: localGameDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            timeZone: 'America/New_York'
          }),
          status: 'scheduled',
          odds: bookmaker ? odds : undefined,
          predictions: []
        };
      });

      console.log(`[OddsAPI] Transformed ${games.length} ${sport} games:`, 
        games.map(g => ({
          id: g.id,
          teams: `${g.homeTeamName} vs ${g.awayTeamName}`,
          date: g.gameDate,
          time: g.startTime,
          hasOdds: !!g.odds
        }))
      );

      return games;
    } catch (error) {
      console.error(`[OddsAPI] Error fetching ${sport} events:`, error);
      return [];
    }
  }
} 