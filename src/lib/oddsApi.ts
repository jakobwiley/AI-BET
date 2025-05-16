import type { Game, SportType, GameStatus } from '../models/types.ts';
import axios from 'axios';
import { handleSportsApiError } from './errors.ts';
import fs from 'fs';
import path from 'path';

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
  private cacheFile: string;
  private scoreCache: Record<string, { home: number; away: number }> = {};

  constructor(apiKey?: string, apiHost?: string) {
    this.API_KEY = apiKey || process.env.THE_ODDS_API_KEY || '';
    this.BASE_URL = apiHost || process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
    this.cacheFile = path.join(process.cwd(), 'score-cache.json');
    this.scoreCache = this.loadScoreCache();
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
    // Generate a consistent game ID with sport prefix
    const sportPrefix = sport.toLowerCase();
    const gameId = `${sportPrefix}-game-${event.id}`;
    
    // Specifically look for DraftKings odds
    const bookmaker = event.bookmakers?.find(b => b.key === 'draftkings') || event.bookmakers?.[0];
    
    // Determine game status based on commence_time
    const gameTime = new Date(event.commence_time);
    const now = new Date();
    let status: GameStatus = 'SCHEDULED';
    
    if (gameTime < now) {
      status = 'FINAL';
    } else if (Math.abs(gameTime.getTime() - now.getTime()) < 3 * 60 * 60 * 1000) { // Within 3 hours
      status = 'IN_PROGRESS';
    }

    if (!bookmaker) {
      return {
        id: gameId,
        sport,
        homeTeamId: event.home_team.toLowerCase().replace(/\s+/g, '-'),
        awayTeamId: event.away_team.toLowerCase().replace(/\s+/g, '-'),
        homeTeamName: event.home_team,
        awayTeamName: event.away_team,
        gameDate: event.commence_time,
        startTime: new Date(event.commence_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }),
        status,
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
      id: gameId,
      sport,
      homeTeamId: event.home_team.toLowerCase().replace(/\s+/g, '-'),
      awayTeamId: event.away_team.toLowerCase().replace(/\s+/g, '-'),
      homeTeamName: event.home_team,
      awayTeamName: event.away_team,
      gameDate: event.commence_time,
      startTime: new Date(event.commence_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }),
      status,
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
            bookmakers: 'draftkings',  // Specifically request DraftKings odds
            dateFormat: 'iso'
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
        
        // Filter for games happening today or tomorrow
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const games = response.data
          .filter(event => {
            const gameDate = new Date(event.commence_time);
            return gameDate >= now && gameDate <= tomorrow;
          })
          .map(event => this.transformEventToGame(event, sport));

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
      handleSportsApiError(error, `fetching games for ${sport || 'all'}`);
      return []; // This line will never be reached due to handleSportsApiError throwing
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
      const response = await axios.get<OddsEvent>(`${this.BASE_URL}/sports/${sportKey}/events/${gameId}/odds`, {
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
      handleSportsApiError(error, `fetching external game ${gameId}`);
      return null; // This line will never be reached due to handleSportsApiError throwing
    }
  }

  async getGameScores(sport: SportType, gameId: string): Promise<{ home: number; away: number } | null> {
    try {
      const sportKey = this.sportMapping[sport];
      // Strip the sport prefix from the game ID if it exists
      const strippedGameId = gameId.replace(/^(nba|mlb)-game-/, '');
      
      console.log(`[OddsApiService] Fetching scores for ${sport} game ${strippedGameId}`);
      const response = await axios.get(`${this.BASE_URL}/sports/${sportKey}/scores`, {
        params: {
          apiKey: this.API_KEY,
          eventIds: strippedGameId,
          daysFrom: 3  // Look back up to 3 days
        }
      });

      // Add debug logging
      console.log(`[OddsApiService] Raw API response for scores:`, JSON.stringify(response.data, null, 2));

      if (!Array.isArray(response.data) || response.data.length === 0) {
        console.log(`[OddsApiService] No scores found for game ${strippedGameId}`);
        return null;
      }

      const game = response.data[0];
      console.log(`[OddsApiService] Found game data:`, JSON.stringify(game, null, 2));

      if (!game.scores) {
        console.log(`[OddsApiService] No scores available for game ${strippedGameId}`);
        return null;
      }

      return {
        home: parseInt(game.scores.home),
        away: parseInt(game.scores.away)
      };
    } catch (error) {
      console.error(`[OddsApiService] Error fetching scores for game ${gameId}:`, error);
      return null;
    }
  }

  private loadScoreCache(): Record<string, { home: number; away: number }> {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      }
    } catch (e) {
      console.warn('[OddsApiService] Failed to load score cache:', e);
    }
    return {};
  }

  private saveScoreCache() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.scoreCache, null, 2));
    } catch (e) {
      console.warn('[OddsApiService] Failed to save score cache:', e);
    }
  }

  public async getGameScoresBatch(sport: SportType, gameIds: string[]): Promise<Record<string, { home: number; away: number }>> {
    const sportKey = this.sportMapping[sport];
    const results: Record<string, { home: number; away: number }> = {};
    const idsToFetch: string[] = [];
    // Check cache first
    for (const gameId of gameIds) {
      if (this.scoreCache[gameId]) {
        results[gameId] = this.scoreCache[gameId];
      } else {
        idsToFetch.push(gameId);
      }
    }
    if (idsToFetch.length > 0) {
      // Batch fetch from API (max 10 per call for safety)
      for (let i = 0; i < idsToFetch.length; i += 10) {
        const batch = idsToFetch.slice(i, i + 10);
        const eventIds = batch.map(id => id.replace(/^(nba|mlb)-game-/, '')).join(',');
        try {
          console.log(`[OddsApiService] Batch fetching scores for ${sport}: ${eventIds}`);
          const response = await axios.get(`${this.BASE_URL}/sports/${sportKey}/scores`, {
            params: {
              apiKey: this.API_KEY,
              eventIds,
              daysFrom: 3
            }
          });
          if (Array.isArray(response.data)) {
            for (const game of response.data) {
              const foundId = game.id || game.event_id || game.key || game.eventId || game.gameId;
              if (foundId) {
                const cacheId = batch.find(id => foundId.endsWith(id.replace(/^(nba|mlb)-game-/, '')) || foundId === id);
                if (cacheId && game.scores) {
                  results[cacheId] = {
                    home: parseInt(game.scores.home),
                    away: parseInt(game.scores.away)
                  };
                  this.scoreCache[cacheId] = results[cacheId];
                }
              }
            }
          }
        } catch (error) {
          console.error(`[OddsApiService] Error batch fetching scores:`, error);
        }
      }
      this.saveScoreCache();
    }
    return results;
  }

  async getTodaysOdds(): Promise<{ gameId: string; odds: any }[]> {
    // Placeholder implementation to fetch today's odds
    // Replace with actual API call or data fetching logic
    return [];
  }
} 