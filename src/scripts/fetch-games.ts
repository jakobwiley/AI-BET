import { OddsApiService } from '../src/lib/oddsApi';
import { PredictionService } from '../src/lib/predictionService';
import { Prediction } from '../src/models/types';
import { config } from 'dotenv';

// Load environment variables
config();

async function fetchAndDisplayGames() {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const apiHost = process.env.ODDS_API_HOST;
  
  if (!apiKey || !apiHost) {
    console.error('Missing API credentials. Please check your .env file.');
    process.exit(1);
  }

  const oddsService = new OddsApiService(apiKey, apiHost);
  
  console.log('Fetching NBA games...');
  const nbaGames = await oddsService.getUpcomingGames('NBA');
  console.log('\nNBA Games and Predictions:');
  
  for (const game of nbaGames) {
    console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
    console.log(`Game Time: ${new Date(game.gameDate).toLocaleString()}`);
    
    // Get predictions for this game
    const predictions = await PredictionService.getPredictionsForGame(game);
    
    if (game.odds?.spread) {
      console.log(`Spread: ${game.awayTeamName} ${game.odds.spread.awaySpread > 0 ? '+' : ''}${game.odds.spread.awaySpread} (${game.odds.spread.awayOdds})`);
      const spreadPrediction = predictions.find((p: Prediction) => p.predictionType === 'SPREAD');
      if (spreadPrediction) {
        console.log(`Spread Confidence: ${(spreadPrediction.confidence * 100).toFixed(1)}%`);
        console.log(`Reasoning: ${spreadPrediction.reasoning}`);
      }
    }
    
    if (game.odds?.total) {
      console.log(`Total: O/U ${game.odds.total.overUnder} (O: ${game.odds.total.overOdds}, U: ${game.odds.total.underOdds})`);
      const totalPrediction = predictions.find((p: Prediction) => p.predictionType === 'TOTAL');
      if (totalPrediction) {
        console.log(`Total Confidence: ${(totalPrediction.confidence * 100).toFixed(1)}%`);
        console.log(`Reasoning: ${totalPrediction.reasoning}`);
      }
    }
    
    if (game.odds?.moneyline) {
      console.log(`Moneyline: ${game.awayTeamName} ${game.odds.moneyline.awayOdds > 0 ? '+' : ''}${game.odds.moneyline.awayOdds} / ${game.homeTeamName} ${game.odds.moneyline.homeOdds > 0 ? '+' : ''}${game.odds.moneyline.homeOdds}`);
      const moneylinePrediction = predictions.find((p: Prediction) => p.predictionType === 'MONEYLINE');
      if (moneylinePrediction) {
        console.log(`Moneyline Confidence: ${(moneylinePrediction.confidence * 100).toFixed(1)}%`);
        console.log(`Reasoning: ${moneylinePrediction.reasoning}`);
      }
    }
    console.log('----------------------------------------');
  }

  console.log('\nFetching MLB games...');
  const mlbGames = await oddsService.getUpcomingGames('MLB');
  console.log('\nMLB Games and Predictions:');
  
  for (const game of mlbGames) {
    console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
    console.log(`Game Time: ${new Date(game.gameDate).toLocaleString()}`);
    
    // Get predictions for this game
    const predictions = await PredictionService.getPredictionsForGame(game);
    
    if (game.odds?.spread) {
      console.log(`Spread: ${game.awayTeamName} ${game.odds.spread.awaySpread > 0 ? '+' : ''}${game.odds.spread.awaySpread} (${game.odds.spread.awayOdds})`);
      const spreadPrediction = predictions.find((p: Prediction) => p.predictionType === 'SPREAD');
      if (spreadPrediction) {
        console.log(`Spread Confidence: ${(spreadPrediction.confidence * 100).toFixed(1)}%`);
        console.log(`Reasoning: ${spreadPrediction.reasoning}`);
      }
    }
    
    if (game.odds?.total) {
      console.log(`Total: O/U ${game.odds.total.overUnder} (O: ${game.odds.total.overOdds}, U: ${game.odds.total.underOdds})`);
      const totalPrediction = predictions.find((p: Prediction) => p.predictionType === 'TOTAL');
      if (totalPrediction) {
        console.log(`Total Confidence: ${(totalPrediction.confidence * 100).toFixed(1)}%`);
        console.log(`Reasoning: ${totalPrediction.reasoning}`);
      }
    }
    
    if (game.odds?.moneyline) {
      console.log(`Moneyline: ${game.awayTeamName} ${game.odds.moneyline.awayOdds > 0 ? '+' : ''}${game.odds.moneyline.awayOdds} / ${game.homeTeamName} ${game.odds.moneyline.homeOdds > 0 ? '+' : ''}${game.odds.moneyline.homeOdds}`);
      const moneylinePrediction = predictions.find((p: Prediction) => p.predictionType === 'MONEYLINE');
      if (moneylinePrediction) {
        console.log(`Moneyline Confidence: ${(moneylinePrediction.confidence * 100).toFixed(1)}%`);
        console.log(`Reasoning: ${moneylinePrediction.reasoning}`);
      }
    }
    console.log('----------------------------------------');
  }
}

fetchAndDisplayGames().catch(console.error); 