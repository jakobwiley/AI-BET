import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class OddsApiService {
  constructor(apiKey, apiHost) {
    this.API_KEY = apiKey || process.env.THE_ODDS_API_KEY || '';
    this.BASE_URL = apiHost || process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
    this.sportMapping = {
      'NBA': 'basketball_nba',
      'MLB': 'baseball_mlb'
    };
    this.cacheFile = path.join(process.cwd(), 'score-cache.json');
    this.cache = this.loadCache();
    if (!this.API_KEY) {
      console.warn('[OddsApiService] No API key provided or found in environment');
    }
  }

  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      }
    } catch (e) {
      console.warn('[OddsApiService] Failed to load score cache:', e);
    }
    return {};
  }

  saveCache() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      console.warn('[OddsApiService] Failed to save score cache:', e);
    }
  }

  async getGameScoresBatch(sport, gameIds) {
    const sportKey = this.sportMapping[sport];
    const results = {};
    const idsToFetch = [];
    // Check cache first
    for (const gameId of gameIds) {
      if (this.cache[gameId]) {
        results[gameId] = this.cache[gameId];
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
                  this.cache[cacheId] = results[cacheId];
                }
              }
            }
          }
        } catch (error) {
          console.error(`[OddsApiService] Error batch fetching scores:`, error);
        }
      }
      this.saveCache();
    }
    return results;
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