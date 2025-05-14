import { OddsApiService } from '../lib/oddsApi.js';
import { PredictionService } from '../lib/predictionService.js';
import { Prediction } from '../models/types.js';
import { config } from 'dotenv';

// Load environment variables
config();

class FetchGamesError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'FetchGamesError';
  }
}

async function validateApiCredentials(): Promise<{ apiKey: string; apiHost: string }> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const apiHost = process.env.ODDS_API_HOST;
  
  if (!apiKey || !apiHost) {
    throw new FetchGamesError('Missing API credentials. Please check your .env file.');
  }
  
  return { apiKey, apiHost };
}

async function fetchGamesForSport(oddsService: OddsApiService, sport: 'NBA' | 'MLB'): Promise<any[]> {
  try {
    console.log(`Fetching ${sport} games...`);
    const games = await oddsService.getUpcomingGames(sport);
    
    if (!Array.isArray(games)) {
      throw new FetchGamesError(`Invalid response format for ${sport} games`);
    }
    
    console.log(`Successfully fetched ${games.length} ${sport} games`);
    return games;
  } catch (error) {
    throw new FetchGamesError(`Failed to fetch ${sport} games`, error);
  }
}

async function displayGamePredictions(game: any, predictions: Prediction[]) {
  try {
    console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
    console.log(`Game Time: ${new Date(game.gameDate).toLocaleString()}`);
    
    if (game.odds?.spread) {
      const awaySpread = parseFloat(game.odds.spread.awaySpread);
      if (isNaN(awaySpread)) {
        console.warn(`⚠️ Invalid spread value for game ${game.id}: ${game.odds.spread.awaySpread}`);
      } else {
        console.log(`Spread: ${game.awayTeamName} ${awaySpread > 0 ? '+' : ''}${awaySpread} (${game.odds.spread.awayOdds})`);
        const spreadPrediction = predictions.find((p: Prediction) => p.predictionType === 'SPREAD');
        if (spreadPrediction) {
          console.log(`Spread Confidence: ${(spreadPrediction.confidence * 100).toFixed(1)}%`);
          console.log(`Reasoning: ${spreadPrediction.reasoning}`);
        }
      }
    }
    
    if (game.odds?.total) {
      const overUnder = parseFloat(game.odds.total.overUnder);
      if (isNaN(overUnder)) {
        console.warn(`⚠️ Invalid total value for game ${game.id}: ${game.odds.total.overUnder}`);
      } else {
        console.log(`Total: O/U ${overUnder} (O: ${game.odds.total.overOdds}, U: ${game.odds.total.underOdds})`);
        const totalPrediction = predictions.find((p: Prediction) => p.predictionType === 'TOTAL');
        if (totalPrediction) {
          console.log(`Total Confidence: ${(totalPrediction.confidence * 100).toFixed(1)}%`);
          console.log(`Reasoning: ${totalPrediction.reasoning}`);
        }
      }
    }
    
    if (game.odds?.moneyline) {
      const awayOdds = parseFloat(game.odds.moneyline.awayOdds);
      const homeOdds = parseFloat(game.odds.moneyline.homeOdds);
      
      if (isNaN(awayOdds) || isNaN(homeOdds)) {
        console.warn(`⚠️ Invalid moneyline values for game ${game.id}`);
      } else {
        console.log(`Moneyline: ${game.awayTeamName} ${awayOdds > 0 ? '+' : ''}${awayOdds} / ${game.homeTeamName} ${homeOdds > 0 ? '+' : ''}${homeOdds}`);
        const moneylinePrediction = predictions.find((p: Prediction) => p.predictionType === 'MONEYLINE');
        if (moneylinePrediction) {
          console.log(`Moneyline Confidence: ${(moneylinePrediction.confidence * 100).toFixed(1)}%`);
          console.log(`Reasoning: ${moneylinePrediction.reasoning}`);
        }
      }
    }
    console.log('----------------------------------------');
  } catch (error) {
    console.error(`Error displaying predictions for game ${game.id}:`, error);
  }
}

async function fetchAndDisplayGames() {
  try {
    const { apiKey, apiHost } = await validateApiCredentials();
    const oddsService = new OddsApiService(apiKey, apiHost);
    
    // Fetch NBA games
    const nbaGames = await fetchGamesForSport(oddsService, 'NBA');
    console.log('\nNBA Games and Predictions:');
    
    for (const game of nbaGames) {
      try {
        const predictions = await PredictionService.getPredictionsForGame(game);
        await displayGamePredictions(game, predictions);
      } catch (error) {
        console.error(`Failed to process NBA game ${game.id}:`, error);
        continue; // Continue with next game even if one fails
      }
    }

    // Fetch MLB games
    const mlbGames = await fetchGamesForSport(oddsService, 'MLB');
    console.log('\nMLB Games and Predictions:');
    
    for (const game of mlbGames) {
      try {
        const predictions = await PredictionService.getPredictionsForGame(game);
        await displayGamePredictions(game, predictions);
      } catch (error) {
        console.error(`Failed to process MLB game ${game.id}:`, error);
        continue; // Continue with next game even if one fails
      }
    }
  } catch (error) {
    if (error instanceof FetchGamesError) {
      console.error(`Error: ${error.message}`);
      if (error.cause) {
        console.error('Caused by:', error.cause);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Execute the script
fetchAndDisplayGames().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 