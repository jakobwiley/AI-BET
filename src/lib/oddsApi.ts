import { Game, SportType, GameStatus } from '../models/types';
import axios from 'axios';

interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsMarket {
  key: string; // 'h2h', 'spreads', 'totals'
  outcomes: OddsOutcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}

interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Bookmaker[];
}

export class OddsApiService {
  private readonly API_KEY: string;
  private readonly BASE_URL: string;
  private readonly sportMapping: Record<SportType, string> = {
    'NBA': 'basketball_nba',
    'MLB': 'baseball_mlb'
  };
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hour cache TTL

  constructor(apiKey?: string, apiHost?: string) {
    this.API_KEY = apiKey || process.env.THE_ODDS_API_KEY || '';
    this.BASE_URL = apiHost || process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
    
    if (!this.API_KEY) {
      console.warn('[OddsApiService] No API key provided or found in environment');
    }
  }

  private getCacheKey(sport: SportType): string {
    return `${sport}:upcoming`;
  }

  private getFromCache<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  private transformEventToGame(event: OddsEvent, sport: SportType): Game {
    // Specifically look for DraftKings odds
    const bookmaker = event.bookmakers?.find(b => b.key === 'draftkings') || event.bookmakers?.[0];
    if (!bookmaker) {
      return {
        id: event.id,
        sport,
        homeTeamId: event.home_team.toLowerCase().replace(/\s+/g, '-'),
        awayTeamId: event.away_team.toLowerCase().replace(/\s+/g, '-'),
        homeTeamName: event.home_team,
        awayTeamName: event.away_team,
        gameDate: event.commence_time,
        startTime: new Date(event.commence_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }),
        status: GameStatus.SCHEDULED,
        odds: { spread: undefined, total: undefined, moneyline: undefined },
        probableHomePitcherName: undefined,
        probableAwayPitcherName: undefined
      };
    }

    const markets = bookmaker.markets;
    const h2hMarket = markets.find(m => m.key === 'h2h');
    const spreadsMarket = markets.find(m => m.key === 'spreads');
    const totalsMarket = markets.find(m => m.key === 'totals');

    return {
      id: event.id,
      sport,
      homeTeamId: event.home_team.toLowerCase().replace(/\s+/g, '-'),
      awayTeamId: event.away_team.toLowerCase().replace(/\s+/g, '-'),
      homeTeamName: event.home_team,
      awayTeamName: event.away_team,
      gameDate: event.commence_time,
      startTime: new Date(event.commence_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }),
      status: GameStatus.SCHEDULED,
      odds: {
        spread: spreadsMarket?.outcomes?.length === 2 ? {
          homeSpread: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.point || 0,
          awaySpread: spreadsMarket.outcomes.find(o => o.name === event.away_team)?.point || 0,
          homeOdds: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.price || -110,
          awayOdds: spreadsMarket.outcomes.find(o => o.name === event.away_team)?.price || -110
        } : undefined,
        total: totalsMarket?.outcomes?.length === 2 ? {
          overUnder: totalsMarket.outcomes[0]?.point || 0,
          overOdds: totalsMarket.outcomes.find(o => o.name === 'Over')?.price || -110,
          underOdds: totalsMarket.outcomes.find(o => o.name === 'Under')?.price || -110
        } : undefined,
        moneyline: h2hMarket?.outcomes?.length === 2 ? {
          homeOdds: h2hMarket.outcomes.find(o => o.name === event.home_team)?.price || 0,
          awayOdds: h2hMarket.outcomes.find(o => o.name === event.away_team)?.price || 0
        } : undefined
      },
      probableHomePitcherName: undefined,
      probableAwayPitcherName: undefined
    };
  }

  async getUpcomingGames(sport?: SportType): Promise<Game[]> {
    try {
      if (sport) {
        const cacheKey = this.getCacheKey(sport);
        const cachedGames = this.getFromCache<Game[]>(cacheKey);
        if (cachedGames) {
          console.log(`[OddsApiService] Returning ${cachedGames.length} cached ${sport} games.`);
          return cachedGames;
        }

        console.log(`[OddsApiService] Fetching fresh ${sport} games from API...`);
        const sportKey = this.sportMapping[sport];
        const response = await axios.get(`${this.BASE_URL}/sports/${sportKey}/odds`, {
          params: {
            apiKey: this.API_KEY,
            regions: 'us',
            markets: 'spreads,totals,h2h',
            oddsFormat: 'american',
            bookmakers: 'draftkings'  // Specifically request DraftKings odds
          }
        });

        // Log the raw API response specifically for MLB
        if (sport === 'MLB') {
          console.log(`[OddsApiService] Raw MLB API response data:`, response.data);
        }

        if (!Array.isArray(response.data)) {
          console.warn(`[OddsApiService] API response for ${sport} is not an array:`, response.data);
          return [];
        }
        
        const games = response.data.map(event => this.transformEventToGame(event, sport));
        console.log(`[OddsApiService] Fetched and transformed ${games.length} ${sport} games.`);
        this.setCache(cacheKey, games);
        return games;
      }

      // If no specific sport, fetch both NBA and MLB
      console.log(`[OddsApiService] Fetching both NBA and MLB games...`);
      const [nbaGames, mlbGames] = await Promise.all([
        this.getUpcomingGames('NBA'),
        this.getUpcomingGames('MLB')
      ]);

      return [...nbaGames, ...mlbGames];
    } catch (error) {
      console.error(`[OddsApiService] Error fetching games for ${sport || 'all'}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('[OddsApiService] Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          config: error.config,
        });
      }
      return [];
    }
  }

  async findGameByIdInUpcoming(gameId: string): Promise<Game | null> {
    const allGames = await this.getUpcomingGames();
    return allGames.find(game => game.id === gameId) || null;
  }

  async getExternalGameById(sport: SportType, gameId: string): Promise<Game | null> {
    if (!this.sportMapping[sport]) {
      console.error(`[OddsApiService] Unsupported sport: ${sport}`);
      return null;
    }

    const cacheKey = this.getCacheKey(sport);
    const cachedGame = this.getFromCache<Game>(cacheKey);
    if (cachedGame) {
      return cachedGame;
    }

    const sportKey = this.sportMapping[sport];
    
    try {
      const response = await axios.get(`${this.BASE_URL}/sports/${sportKey}/events/${gameId}/odds`, {
        params: {
          apiKey: this.API_KEY,
          dateFormat: 'iso',
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'american'
        }
      });
      
      const event = response.data;
      if (!event || !event.id) {
        console.warn(`[OddsApiService] No event data returned for game ${gameId}`);
        return null;
      }

      const game = this.transformEventToGame(event, sport);
      this.setCache(cacheKey, game);
      return game;

    } catch (error) {
      console.error(`[OddsApiService] Error fetching external game ${gameId}:`, error);
      // Handle 404 specifically?
      return null;
    }
  }
} 