import { Game, Prediction, PlayerProp, SportType, PredictionType } from '@/models/types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Define environment variables
const API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || 'be72ccb153316fd0d1c07b44a4394e9d';
const API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

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

export class OddsApiService {
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

  private static async apiRequest<T>(method: string, endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const url = `${API_HOST}${endpoint}`;
      const queryParams = {
        apiKey: API_KEY,
        ...params
      };

      this.logRequest(method, url);

      const response = await axios({
        method,
        url,
        params: queryParams
      });

      this.logResponse(response.data);
      return response.data;
    } catch (error: any) {
      this.logError(error);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  public static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      const sportKey = sportMapping[sport];
      const endpoint = ENDPOINTS.ODDS.replace('{sport}', sportKey);
      
      const oddsData = await this.apiRequest<OddsResponse[]>('GET', endpoint, {
        regions: 'us',
        markets: 'spreads,totals,h2h',
        oddsFormat: 'american'
      });

      return oddsData.map(game => this.transformGameData(game, sport));
    } catch (error) {
      console.error('Error fetching upcoming games:', error);
      return [];
    }
  }

  public static async getGameOdds(gameId: string, sport: SportType): Promise<Prediction[]> {
    try {
      const sportKey = sportMapping[sport];
      const endpoint = ENDPOINTS.ODDS.replace('{sport}', sportKey);
      
      const oddsData = await this.apiRequest<OddsResponse[]>('GET', endpoint, {
        regions: 'us',
        markets: 'spreads,totals,h2h',
        oddsFormat: 'american',
        eventIds: gameId
      });

      if (!oddsData.length) {
        throw new Error('No odds data found for this game');
      }

      return this.transformOddsData(oddsData[0], gameId);
    } catch (error) {
      console.error('Error fetching game odds:', error);
      return [];
    }
  }

  public static async getPlayerProps(gameId: string, sport: SportType): Promise<PlayerProp[]> {
    try {
      const sportKey = sportMapping[sport];
      const endpoint = ENDPOINTS.PLAYER_PROPS.replace('{sport}', sportKey);
      
      const propsData = await this.apiRequest<OddsResponse[]>('GET', endpoint, {
        regions: 'us',
        oddsFormat: 'american',
        eventIds: gameId
      });

      if (!propsData.length) {
        throw new Error('No player props found for this game');
      }

      return this.transformPlayerProps(propsData[0], gameId, sport);
    } catch (error) {
      console.error('Error fetching player props:', error);
      return [];
    }
  }

  private static transformGameData(game: OddsResponse, sport: SportType): Game {
    const id = game.id;
    const homeTeamName = game.home_team;
    const awayTeamName = game.away_team;
    const startTime = game.commence_time;
    
    // Get spread if available
    let spread;
    const spreadMarket = game.bookmakers[0]?.markets.find(m => m.key === 'spreads');
    if (spreadMarket) {
      const homeSpread = spreadMarket.outcomes.find(o => o.name === homeTeamName)?.point || 0;
      const awaySpread = spreadMarket.outcomes.find(o => o.name === awayTeamName)?.point || 0;
      spread = { home: homeSpread, away: awaySpread };
    }
    
    // Create a simple game object
    return {
      id,
      sport,
      homeTeamId: homeTeamName.replace(/\s+/g, '').toLowerCase(),
      awayTeamId: awayTeamName.replace(/\s+/g, '').toLowerCase(),
      homeTeamName,
      awayTeamName,
      startTime,
      gameDate: startTime,
      status: 'Scheduled'
    };
  }

  private static transformOddsData(game: OddsResponse, gameId: string): Prediction[] {
    const predictions: Prediction[] = [];
    const bookmaker = game.bookmakers[0]; // Using first bookmaker for simplicity
    
    if (!bookmaker) {
      return [];
    }

    // Process spread
    const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
    if (spreadMarket) {
      const homeOutcome = spreadMarket.outcomes.find(o => o.name === game.home_team);
      if (homeOutcome?.point) {
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: 'SPREAD',
          predictionValue: homeOutcome.point,
          confidence: this.calculateConfidence(homeOutcome.price),
          createdAt: new Date().toISOString()
        });
      }
    }

    // Process moneyline
    const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
    if (h2hMarket) {
      const homeOutcome = h2hMarket.outcomes.find(o => o.name === game.home_team);
      const awayOutcome = h2hMarket.outcomes.find(o => o.name === game.away_team);
      
      if (homeOutcome && awayOutcome) {
        const homeConfidence = this.calculateConfidence(homeOutcome.price);
        const awayConfidence = this.calculateConfidence(awayOutcome.price);
        
        // Predict the team with higher confidence
        const prediction = homeConfidence > awayConfidence
          ? { team: 'HOME', confidence: homeConfidence }
          : { team: 'AWAY', confidence: awayConfidence };
        
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: 'MONEYLINE',
          predictionValue: prediction.team,
          confidence: prediction.confidence,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Process totals
    const totalsMarket = bookmaker.markets.find(m => m.key === 'totals');
    if (totalsMarket) {
      const overOutcome = totalsMarket.outcomes.find(o => o.name === 'Over');
      const underOutcome = totalsMarket.outcomes.find(o => o.name === 'Under');
      
      if (overOutcome?.point && underOutcome) {
        const overConfidence = this.calculateConfidence(overOutcome.price);
        const underConfidence = this.calculateConfidence(underOutcome.price);
        
        // Create total points prediction
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: 'TOTAL',
          predictionValue: overOutcome.point,
          confidence: Math.max(overConfidence, underConfidence),
          createdAt: new Date().toISOString()
        });
        
        // Create over/under prediction
        predictions.push({
          id: uuidv4(),
          gameId,
          predictionType: 'OVER_UNDER',
          predictionValue: overConfidence > underConfidence ? 'OVER' : 'UNDER',
          confidence: Math.max(overConfidence, underConfidence),
          createdAt: new Date().toISOString()
        });
      }
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
} 