import { Game, Prediction, PlayerProp, SportType, PredictionType } from '@/models/types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from './cacheService';

// Define environment variables
const API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
const LOG_LEVEL = process.env.ODDS_API_LOG_LEVEL || 'info';

// Debug environment variables
console.log('API Key:', API_KEY ? 'Present' : 'Missing');
console.log('API Host:', API_HOST);
console.log('Log Level:', LOG_LEVEL);

// Validate API key
if (!API_KEY) {
  console.error('NEXT_PUBLIC_THE_ODDS_API_KEY is not defined in environment variables');
}

// Map sport types to API format
const sportMapping: Record<SportType, string> = {
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb'
};

// API endpoints
const ENDPOINTS = {
  ODDS: '/sports/{sport}/odds',
  SCORES: '/sports/{sport}/scores',
  PLAYER_PROPS: '/sports/{sport}/odds/?markets=player_props'
};

// Define all available markets to request in a single call
const ALL_MARKETS = 'h2h,spreads,totals';

// Interface for odds response
interface OddsResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

interface Outcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
}

export interface ApiUsage {
  used: number;
  limit: number;
  lastResetDate: Date;
}

export class OddsApiService {
  private static cacheService = CacheService.getInstance();
  private static API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
  private static API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
  private static LOG_LEVEL = process.env.ODDS_API_LOG_LEVEL || 'info';
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static apiUsage: ApiUsage = {
    used: 0,
    limit: 500,
    lastResetDate: new Date()
  };

  private static logRequest(method: string, url: string): void {
    if (LOG_LEVEL === 'DEBUG') {
      console.log(`[OddsAPI] ${method} ${url}`);
    }
  }

  private static logResponse(data: any): void {
    if (LOG_LEVEL === 'DEBUG') {
      console.log('[OddsAPI] Response:', data);
    }
  }

  private static logError(error: any): void {
    console.error('[OddsAPI] Error:', error.response?.data || error.message || error);
  }
  
  private static logCacheHit(key: string): void {
    if (LOG_LEVEL === 'DEBUG') {
      console.log(`[OddsAPI] Cache hit for: ${key}`);
    }
  }

  private static async apiRequest<T>(
    method: string, 
    endpoint: string, 
    params: Record<string, any> = {},
    useCache: boolean = false,
    forceFresh: boolean = true
  ): Promise<T> {
    // Create cache key based on endpoint and params
    const cacheKey = `oddsapi:${endpoint}:${JSON.stringify(params)}`;
    
    // Check if we should use cached data
    if (useCache && !forceFresh) {
      const cachedData = this.cacheService.get<T>(cacheKey);
      if (cachedData) {
        this.logCacheHit(cacheKey);
        return cachedData;
      }
    }
    
    // Validate API key
    if (!API_KEY) {
      throw new Error('API key is not configured. Please check your environment variables.');
    }
    
    try {
      const url = `${API_HOST}${endpoint}`;
      const queryParams = {
        apiKey: API_KEY,
        ...params
      };

      this.logRequest(method, url);
      
      // Debug the request
      console.log(`[OddsAPI] Making request to: ${url}`);
      console.log(`[OddsAPI] Using API key: ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);
      console.log(`[OddsAPI] Query params:`, queryParams);
      
      // Record the API call before making the request
      this.cacheService.recordApiCall(endpoint);

      const response = await axios({
        method,
        url,
        params: queryParams
      });

      this.logResponse(response.data);
      console.log(`[OddsAPI] Response status: ${response.status}`);
      console.log(`[OddsAPI] Response data:`, response.data);
      
      return response.data;
    } catch (error: any) {
      this.logError(error);
      throw error;
    }
  }

  static async getUpcomingGames(sport: SportType, forceFresh: boolean = true): Promise<Game[]> {
    try {
      console.log(`[OddsAPI] Fetching ${sport} games, forceFresh: ${forceFresh}`);
      const sportKey = sportMapping[sport];
      const endpoint = ENDPOINTS.ODDS.replace('{sport}', sportKey);
      
      const params = {
        regions: 'us',
        markets: ALL_MARKETS,
        oddsFormat: 'american',
        bookmakers: 'draftkings'
      };

      const response = await this.apiRequest<OddsResponse[]>('GET', endpoint, params, false, true);
      console.log(`[OddsAPI] Received ${response.length} games for ${sport}`);

      return response.map(game => this.transformGameData(game, sport));
    } catch (error) {
      console.error(`[OddsAPI] Error fetching ${sport} games:`, error);
      throw error;
    }
  }

  public static async getGameOdds(sport: SportType, forceFresh: boolean = false): Promise<Game[]> {
    try {
      const sportKey = sportMapping[sport];
      const endpoint = ENDPOINTS.ODDS.replace('{sport}', sportKey);
      
      const oddsData = await this.apiRequest<OddsResponse[]>('GET', endpoint, {
        regions: 'us',
        markets: ALL_MARKETS,
        oddsFormat: 'american',
        bookmakers: 'draftkings'
      }, true, forceFresh);

      if (!oddsData.length) {
        throw new Error('No odds data found for this sport');
      }

      return this.transformOddsResponse(oddsData, sport);
    } catch (error) {
      console.error(`[OddsAPI] Error fetching ${sport} odds:`, error);
      return [];
    }
  }

  public static async getPlayerProps(gameId: string, sport: SportType, forceFresh: boolean = false): Promise<PlayerProp[]> {
    try {
      const sportKey = sportMapping[sport];
      const endpoint = ENDPOINTS.PLAYER_PROPS.replace('{sport}', sportKey);
      
      const propsData = await this.apiRequest<OddsResponse[]>('GET', endpoint, {
        regions: 'us',
        oddsFormat: 'american',
        eventIds: gameId,
        bookmakers: 'draftkings'
      }, true, forceFresh);

      if (!propsData.length) {
        throw new Error('No player props found for this game');
      }

      return this.transformPlayerProps(propsData[0], gameId, sport);
    } catch (error) {
      console.error('Error fetching player props:', error);
      
      // Fallback to mock data if API fails
      console.log(`[OddsAPI] Using mock data for player props: ${gameId}`);
      return this.getMockPlayerProps(gameId, sport);
    }
  }
  
  // Get stats about API usage
  public static getApiUsageStats(): ApiUsage {
    return { ...this.apiUsage };
  }
  
  // Get remaining API calls
  public static getRemainingApiCalls() {
    return this.cacheService.getRemainingCalls();
  }
  
  // Force refresh all cached data
  public static async refreshAllData(): Promise<void> {
    // First clear the cache
    this.cacheService.clear();
    
    // Then fetch fresh data for both sports
    try {
      // Only actually fetch if we have API calls available
      if (!this.cacheService.hasReachedLimit()) {
        await Promise.all([
          this.getUpcomingGames('NBA', true),
          this.getUpcomingGames('MLB', true)
        ]);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }

  private static transformGameData(game: OddsResponse, sport: SportType): Game {
    console.log(`[OddsAPI] Transforming game data for ${game.home_team} vs ${game.away_team}`);
    const draftKingsBookmaker = game.bookmakers.find(b => b.key === 'draftkings');
    
    if (!draftKingsBookmaker) {
      console.warn(`[OddsAPI] No DraftKings odds found for game: ${game.id}`);
    }

    const spreadMarket = draftKingsBookmaker?.markets.find(m => m.key === 'spreads');
    const homeSpread = spreadMarket?.outcomes.find(o => o.name === game.home_team)?.point || 0;
    const awaySpread = spreadMarket?.outcomes.find(o => o.name === game.away_team)?.point || 0;

    return {
      id: game.id,
      sport,
      homeTeamId: game.home_team.toLowerCase().replace(/\s+/g, '-'),
      awayTeamId: game.away_team.toLowerCase().replace(/\s+/g, '-'),
      homeTeamName: game.home_team,
      awayTeamName: game.away_team,
      startTime: game.commence_time,
      gameDate: game.commence_time,
      status: 'SCHEDULED',
      spread: { home: homeSpread, away: awaySpread },
      predictions: this.transformOddsData(game, sport)
    };
  }

  private static transformOddsResponse(data: OddsResponse[], sport: SportType): Game[] {
    console.log(`[OddsAPI] Transforming ${data.length} ${sport} games with odds`);
    
    return data.map(event => {
      const homeTeam = event.home_team;
      const awayTeam = event.away_team;
      const bookmaker = event.bookmakers[0]; // Using first bookmaker for simplicity

      let spread = { home: 0, away: 0 };
      let moneyline = { home: 0, away: 0 };
      let total = 0;

      if (bookmaker) {
        // Get spread
        const spreadMarket = bookmaker.markets.find((m: any) => m.key === 'spreads');
        if (spreadMarket) {
          const homeSpread = spreadMarket.outcomes.find((o: any) => o.name === homeTeam);
          const awaySpread = spreadMarket.outcomes.find((o: any) => o.name === awayTeam);
          spread = {
            home: homeSpread?.point || 0,
            away: awaySpread?.point || 0
          };
        }

        // Get moneyline
        const moneylineMarket = bookmaker.markets.find((m: any) => m.key === 'h2h');
        if (moneylineMarket) {
          const homeMoneyline = moneylineMarket.outcomes.find((o: any) => o.name === homeTeam);
          const awayMoneyline = moneylineMarket.outcomes.find((o: any) => o.name === awayTeam);
          moneyline = {
            home: homeMoneyline?.price || 0,
            away: awayMoneyline?.price || 0
          };
        }

        // Get total
        const totalMarket = bookmaker.markets.find((m: any) => m.key === 'totals');
        if (totalMarket) {
          total = totalMarket.outcomes[0]?.point || 0;
        }
      }

      return {
        id: event.id,
        sport,
        homeTeamId: homeTeam.toLowerCase().replace(/\s+/g, ''),
        awayTeamId: awayTeam.toLowerCase().replace(/\s+/g, ''),
        homeTeamName: homeTeam,
        awayTeamName: awayTeam,
        startTime: event.commence_time,
        gameDate: event.commence_time,
        status: 'SCHEDULED',
        spread,
        moneyline,
        total
      };
    });
  }

  private static transformOddsData(game: OddsResponse, gameId: string): Prediction[] {
    const predictions: Prediction[] = [];
    
    if (!game.bookmakers || game.bookmakers.length === 0) {
      console.warn('No bookmakers found in odds data');
      return predictions;
    }
    
    // Find DraftKings bookmaker
    const bookmaker = game.bookmakers.find(b => b.key === 'draftkings');
    if (!bookmaker) {
      console.warn('DraftKings bookmaker not found in odds data');
      return predictions;
    }
    
    // Process h2h (moneyline) odds
    const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
    if (h2hMarket) {
      h2hMarket.outcomes.forEach(outcome => {
        const isHome = outcome.name === game.home_team;
        const team = isHome ? game.home_team : game.away_team;
        const opponent = isHome ? game.away_team : game.home_team;
        
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: 'MONEYLINE',
          predictionValue: outcome.price,
          confidence: this.calculateConfidence(outcome.price),
          createdAt: new Date().toISOString()
        });
      });
    }
    
    // Process spread odds
    const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
    if (spreadMarket) {
      spreadMarket.outcomes.forEach(outcome => {
        const isHome = outcome.name === game.home_team;
        const team = isHome ? game.home_team : game.away_team;
        const opponent = isHome ? game.away_team : game.home_team;
        
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: 'SPREAD',
          predictionValue: outcome.point || 0,
          confidence: this.calculateConfidence(outcome.price),
          createdAt: new Date().toISOString()
        });
      });
    }
    
    // Process totals (over/under) odds
    const totalsMarket = bookmaker.markets.find(m => m.key === 'totals');
    if (totalsMarket) {
      totalsMarket.outcomes.forEach(outcome => {
        const isOver = outcome.name.toLowerCase().includes('over');
        
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: isOver ? 'OVER_UNDER' : 'OVER_UNDER',
          predictionValue: isOver ? 'OVER' : 'UNDER',
          confidence: this.calculateConfidence(outcome.price),
          createdAt: new Date().toISOString()
        });
      });
    }
    
    return predictions;
  }

  private static transformPlayerProps(game: OddsResponse, gameId: string, sport: SportType): PlayerProp[] {
    const playerProps: PlayerProp[] = [];
    const bookmaker = game.bookmakers.find(b => b.markets.some(m => m.key.includes('player')));
    
    if (!bookmaker) {
      return [];
    }

    // Process player prop markets
    for (const market of bookmaker.markets) {
      // Skip non-player markets
      if (!market.key.includes('player')) continue;
      
      // Parse the market key to get player name and prop type
      const { playerName, propType } = this.parsePlayerPropMarket(market.key, sport);
      
      // Skip if couldn't parse properly
      if (!playerName || !propType) continue;
      
      // Get over/under outcomes
      const overOutcome = market.outcomes.find(o => o.name.includes('Over'));
      const underOutcome = market.outcomes.find(o => o.name.includes('Under'));
      
      if (overOutcome?.point && underOutcome) {
        const overConfidence = this.calculateConfidence(overOutcome.price);
        const underConfidence = this.calculateConfidence(underOutcome.price);
        
        // Determine prediction
        const prediction = overConfidence > underConfidence ? 'OVER' : 'UNDER';
        const confidence = Math.max(overConfidence, underConfidence);
        
        playerProps.push({
          id: uuidv4(),
          gameId,
          playerName,
          propType: propType as any, // Using type assertion as we've validated it
          overUnderValue: overOutcome.point,
          predictionValue: prediction,
          confidence,
          createdAt: new Date().toISOString()
        });
      }
    }

    return playerProps;
  }

  private static parsePlayerPropMarket(marketKey: string, sport: SportType): { playerName: string, propType: string | null } {
    // Example market key: "player_points" or "player_lebron_james_points"
    const parts = marketKey.split('_');
    
    if (parts.length < 2) {
      return { playerName: '', propType: null };
    }
    
    // Get the prop type (last part)
    const propType = parts[parts.length - 1].toUpperCase();
    
    // Extract player name if it exists in the key
    let playerName = '';
    if (parts.length > 2) {
      // Remove "player" and the prop type from parts
      const nameWords = parts.slice(1, -1);
      playerName = nameWords.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    
    // Map prop type to our enum values
    const propTypeMap: Record<string, string> = {
      'POINTS': 'POINTS',
      'REBOUNDS': 'REBOUNDS',
      'ASSISTS': 'ASSISTS',
      'BLOCKS': 'BLOCKS',
      'STEALS': 'STEALS',
      'TURNOVERS': 'TURNOVERS',
      'THREES': 'THREE_POINTERS',
      'THREE_POINTERS': 'THREE_POINTERS',
      'HITS': 'HITS',
      'RUNS': 'RUNS',
      'RBI': 'RBI',
      'STRIKEOUTS': 'STRIKEOUTS',
      'HOME_RUNS': 'HOME_RUNS',
      'STOLEN_BASES': 'STOLEN_BASES',
      'WALKS': 'WALKS'
    };
    
    return { 
      playerName, 
      propType: propTypeMap[propType] || null 
    };
  }

  private static calculateConfidence(price: number): number {
    // Convert American odds to implied probability and map to confidence
    let probability;
    
    if (price > 0) {
      // Positive odds
      probability = 100 / (price + 100);
    } else {
      // Negative odds
      probability = Math.abs(price) / (Math.abs(price) + 100);
    }
    
    // Map probability to a confidence value 0-100
    return Math.round(probability * 100);
  }

  // Mock data for testing when API is not available
  private static getMockGames(sport: SportType): Game[] {
    if (sport === 'NBA') {
      return [
        {
          id: 'nba-game-1',
          sport: 'NBA',
          homeTeamId: 'lakers',
          awayTeamId: 'celtics',
          homeTeamName: 'Los Angeles Lakers',
          awayTeamName: 'Boston Celtics',
          startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          gameDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'Scheduled',
          spread: { home: -5.5, away: 5.5 }
        },
        {
          id: 'nba-game-2',
          sport: 'NBA',
          homeTeamId: 'warriors',
          awayTeamId: 'nets',
          homeTeamName: 'Golden State Warriors',
          awayTeamName: 'Brooklyn Nets',
          startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          gameDate: new Date(Date.now() + 172800000).toISOString(),
          status: 'Scheduled',
          spread: { home: -3.5, away: 3.5 }
        }
      ];
    } else {
      return [
        {
          id: 'mlb-game-1',
          sport: 'MLB',
          homeTeamId: 'yankees',
          awayTeamId: 'redsox',
          homeTeamName: 'New York Yankees',
          awayTeamName: 'Boston Red Sox',
          startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          gameDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'Scheduled',
          spread: { home: -1.5, away: 1.5 }
        },
        {
          id: 'mlb-game-2',
          sport: 'MLB',
          homeTeamId: 'dodgers',
          awayTeamId: 'cubs',
          homeTeamName: 'Los Angeles Dodgers',
          awayTeamName: 'Chicago Cubs',
          startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          gameDate: new Date(Date.now() + 172800000).toISOString(),
          status: 'Scheduled',
          spread: { home: -2.5, away: 2.5 }
        }
      ];
    }
  }

  // Mock data for game odds
  private static getMockGameOdds(gameId: string, sport: SportType): Prediction[] {
    const predictions: Prediction[] = [];
    
    // Add spread prediction
    predictions.push({
      id: uuidv4(),
      gameId,
      predictionType: 'SPREAD',
      predictionValue: sport === 'NBA' ? -5.5 : -1.5,
      confidence: 75,
      createdAt: new Date().toISOString()
    });
    
    // Add moneyline prediction
    predictions.push({
      id: uuidv4(),
      gameId,
      predictionType: 'MONEYLINE',
      predictionValue: 'HOME',
      confidence: 65,
      createdAt: new Date().toISOString()
    });
    
    // Add total prediction
    predictions.push({
      id: uuidv4(),
      gameId,
      predictionType: 'TOTAL',
      predictionValue: sport === 'NBA' ? 220.5 : 8.5,
      confidence: 70,
      createdAt: new Date().toISOString()
    });
    
    return predictions;
  }
  
  // Mock data for player props
  private static getMockPlayerProps(gameId: string, sport: SportType): PlayerProp[] {
    const props: PlayerProp[] = [];
    
    if (sport === 'NBA') {
      // NBA player props
      props.push({
        id: uuidv4(),
        gameId,
        playerName: 'LeBron James',
        propType: 'POINTS',
        overUnderValue: 25.5,
        predictionValue: 'OVER',
        confidence: 80,
        createdAt: new Date().toISOString()
      });
      
      props.push({
        id: uuidv4(),
        gameId,
        playerName: 'Stephen Curry',
        propType: 'THREE_POINTERS',
        overUnderValue: 4.5,
        predictionValue: 'OVER',
        confidence: 75,
        createdAt: new Date().toISOString()
      });
    } else {
      // MLB player props
      props.push({
        id: uuidv4(),
        gameId,
        playerName: 'Shohei Ohtani',
        propType: 'HITS',
        overUnderValue: 1.5,
        predictionValue: 'OVER',
        confidence: 70,
        createdAt: new Date().toISOString()
      });
      
      props.push({
        id: uuidv4(),
        gameId,
        playerName: 'Aaron Judge',
        propType: 'HOME_RUNS',
        overUnderValue: 0.5,
        predictionValue: 'OVER',
        confidence: 65,
        createdAt: new Date().toISOString()
      });
    }
    
    return props;
  }

  // Test the API key
  public static async testApiKey(): Promise<boolean> {
    // Check if API key is defined
    if (!API_KEY) {
      console.error('[OddsAPI] API key is not defined. Please check your environment variables.');
      return false;
    }
    
    try {
      // Make a simple request to test the API key
      const url = `${API_HOST}/sports`;
      const queryParams = {
        apiKey: API_KEY
      };

      console.log(`[OddsAPI] Testing API key with request to: ${url}`);
      console.log(`[OddsAPI] Using API key: ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);

      const response = await axios({
        method: 'GET',
        url,
        params: queryParams
      });

      console.log(`[OddsAPI] API key test successful! Response status: ${response.status}`);
      console.log(`[OddsAPI] Available sports: ${response.data.map((sport: any) => sport.title).join(', ')}`);
      
      return true;
    } catch (error: any) {
      console.error('[OddsAPI] API key test failed:', error.message);
      
      if (error.response) {
        console.error(`[OddsAPI] Status: ${error.response.status}`);
        console.error(`[OddsAPI] Response: ${JSON.stringify(error.response.data)}`);
      }
      
      return false;
    }
  }

  public static clearCache(): void {
    this.cache.clear();
  }

  private static incrementApiUsage(): void {
    this.apiUsage.used++;
  }

  public static async getGamePredictions(gameId: string, sport: SportType, forceFresh: boolean = false): Promise<Prediction[]> {
    try {
      const sportKey = sportMapping[sport];
      const endpoint = ENDPOINTS.ODDS.replace('{sport}', sportKey);
      
      const oddsData = await this.apiRequest<OddsResponse[]>('GET', endpoint, {
        regions: 'us',
        markets: ALL_MARKETS,
        oddsFormat: 'american',
        bookmakers: 'draftkings'
      }, true, forceFresh);

      if (!oddsData || !Array.isArray(oddsData) || oddsData.length === 0) {
        console.log('[OddsAPI] No odds data available');
        return [];
      }

      // Find the game we're interested in
      const game = oddsData.find(g => g.id === gameId);
      if (!game) {
        console.log(`[OddsAPI] No game found with ID: ${gameId}`);
        return [];
      }

      if (!game.bookmakers || game.bookmakers.length === 0) {
        console.log('[OddsAPI] No bookmakers data available for this game');
        return [];
      }

      const bookmaker = game.bookmakers[0];
      const predictions: Prediction[] = [];

      // Add spread prediction
      const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
      if (spreadMarket && spreadMarket.outcomes) {
        const homeSpread = spreadMarket.outcomes.find(o => o.name === game.home_team);
        if (homeSpread) {
          const spreadPoints = homeSpread.point ?? 0;
          predictions.push({
            id: uuidv4(),
            gameId,
            predictionType: 'SPREAD',
            predictionValue: spreadPoints >= 0 ? `+${spreadPoints}` : `${spreadPoints}`,
            confidence: 0.7,
            reasoning: `${game.home_team} is favored by ${Math.abs(spreadPoints)} points`,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Add moneyline prediction
      const moneylineMarket = bookmaker.markets.find(m => m.key === 'h2h');
      if (moneylineMarket && moneylineMarket.outcomes) {
        const homeMoneyline = moneylineMarket.outcomes.find(o => o.name === game.home_team);
        const awayMoneyline = moneylineMarket.outcomes.find(o => o.name === game.away_team);
        if (homeMoneyline && awayMoneyline) {
          const homePrice = homeMoneyline.price ?? 0;
          const awayPrice = awayMoneyline.price ?? 0;
          const favorite = homePrice < awayPrice ? game.home_team : game.away_team;
          const favoritePrice = homePrice < awayPrice ? homePrice : awayPrice;
          predictions.push({
            id: uuidv4(),
            gameId,
            predictionType: 'MONEYLINE',
            predictionValue: favoritePrice >= 0 ? `+${favoritePrice}` : `${favoritePrice}`,
            confidence: 0.65,
            reasoning: `${favorite} is favored to win with moneyline odds of ${favoritePrice}`,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Add total prediction
      const totalMarket = bookmaker.markets.find(m => m.key === 'totals');
      if (totalMarket && totalMarket.outcomes && totalMarket.outcomes.length > 0) {
        const totalPoints = totalMarket.outcomes[0].point ?? 0;
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: 'TOTAL',
          predictionValue: `O/U ${totalPoints}`,
          confidence: 0.6,
          reasoning: `The total points line is set at ${totalPoints}`,
          createdAt: new Date().toISOString()
        });
      }

      return predictions;
    } catch (error) {
      console.error(`[OddsAPI] Error fetching game predictions:`, error);
      return [];
    }
  }
} 