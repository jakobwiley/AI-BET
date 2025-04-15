import axios from 'axios';

export class OddsApiService {
  constructor(apiKey, apiHost) {
    this.API_KEY = apiKey || process.env.THE_ODDS_API_KEY || '';
    this.BASE_URL = apiHost || process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
    this.sportMapping = {
      'NBA': 'basketball_nba',
      'MLB': 'baseball_mlb'
    };
    
    if (!this.API_KEY) {
      console.warn('[OddsApiService] No API key provided or found in environment');
    }
  }

  async getGameScores(sport, gameId) {
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

      if (!Array.isArray(response.data) || response.data.length === 0) {
        console.log(`[OddsApiService] No scores found for game ${strippedGameId}`);
        return null;
      }

      const game = response.data[0];
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
} 