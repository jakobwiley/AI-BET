#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { fileURLToPath } from 'url';
import { EnhancedPredictionModel } from './src/lib/prediction/enhanced-model.ts';
import { getYesterdaysResults, formatResultsSummary } from './scripts/get-yesterdays-results.ts';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const CONFIDENCE_THRESHOLD = 65; // Only show predictions with confidence >= 65%

async function fetchGames(sport: string | null = null) {
  try {
    const url = sport ? `${API_BASE_URL}/games?sport=${sport}` : `${API_BASE_URL}/games`;
    console.log(`Fetching games from: ${url}`);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching games:', error.message);
    return [];
  }
}

interface Game {
  id: string;
  gameDate: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  odds?: any;
  oddsJson?: any;
  predictions?: any[];
  sport: string;
}

function filterTodaysGames(games: Game[]) {
  const today = new Date('2025-04-24T00:00:00.000Z');
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log(`Filtering games between ${today.toISOString()} and ${tomorrow.toISOString()}`);
  
  return games.filter(game => {
    const gameDate = new Date(game.gameDate);
    const isToday = gameDate >= today && gameDate < tomorrow;
    if (isToday) {
      console.log(`Found game today: ${game.awayTeamName} @ ${game.homeTeamName}`);
    }
    return isToday;
  });
}

function getBestPredictions(game) {
  if (!game.predictions || game.predictions.length === 0) {
    return [];
  }
  
  // Log predictions for debugging
  console.log(`Game ${game.awayTeamName} @ ${game.homeTeamName} has ${game.predictions.length} predictions`);
  
  // Create enhanced model instance
  const enhancedModel = new EnhancedPredictionModel();
  
  // Group predictions by type
  const predictionsByType = game.predictions.reduce((acc, prediction) => {
    if (!acc[prediction.predictionType]) {
      acc[prediction.predictionType] = [];
    }
    
    // Enhance the prediction with our model
    const input = {
      predictionType: prediction.predictionType,
      rawConfidence: prediction.confidence,
      predictionValue: prediction.predictionValue.toString(),
      game: {
        homeTeamName: game.homeTeamName,
        awayTeamName: game.awayTeamName,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status
      }
    };
    
    const quality = enhancedModel.getPredictionQuality(input);
    prediction.enhancedConfidence = quality.confidence;
    prediction.warning = quality.warning;
    prediction.recommendation = quality.recommendation;
    
    acc[prediction.predictionType].push(prediction);
    return acc;
  }, {});
  
  // For each type, get the highest confidence prediction that is recommended
  return Object.keys(predictionsByType).map(type => {
    const predictions = predictionsByType[type]
      .filter(p => p.recommendation === 'ACCEPT')
      .sort((a, b) => b.enhancedConfidence - a.enhancedConfidence);
    return predictions[0];
  }).filter(prediction => prediction && prediction.enhancedConfidence >= (CONFIDENCE_THRESHOLD / 100));
}

function formatPredictionValue(prediction, game) {
  // Debug game odds issue
  console.log(`Formatting prediction for ${game.homeTeamName} vs ${game.awayTeamName}:`);
  console.log(`  - Game ID: ${game.id}`);
  console.log(`  - Prediction type: ${prediction.predictionType}`);
  console.log(`  - Prediction value: ${prediction.predictionValue}`);
  console.log(`  - Game odds:`, JSON.stringify(game.odds || 'No odds available'));
  
  // First check if the game.odds is a string (as it might be serialized JSON)
  if (typeof game.odds === 'string') {
    try {
      game.odds = JSON.parse(game.odds);
      console.log(`  - Parsed game odds from string:`, JSON.stringify(game.odds));
    } catch (e) {
      console.log(`  - Failed to parse game odds string:`, e.message);
    }
  }
  
  // Also check if the game.oddsJson field exists (as it might be in the DB model)
  if (!game.odds && game.oddsJson) {
    try {
      if (typeof game.oddsJson === 'string') {
        game.odds = JSON.parse(game.oddsJson);
      } else {
        game.odds = game.oddsJson;
      }
      console.log(`  - Using oddsJson field:`, JSON.stringify(game.odds));
    } catch (e) {
      console.log(`  - Failed to use oddsJson field:`, e.message);
    }
  }
  
  switch (prediction.predictionType) {
    case 'SPREAD':
      // Get actual spread value from odds if available
      let homeSpreadValue = 0;
      let awaySpreadValue = 0;
      let homeOddsSpread = 0;
      let awayOddsSpread = 0;
      
      if (game.odds?.spread) {
        homeSpreadValue = game.odds.spread.homeSpread || 0;
        awaySpreadValue = game.odds.spread.awaySpread || 0;
        homeOddsSpread = game.odds.spread.homeOdds || -110;
        awayOddsSpread = game.odds.spread.awayOdds || -110;
        console.log(`  - Found spread data: homeSpread=${homeSpreadValue}, awaySpread=${awaySpreadValue}, homeOdds=${homeOddsSpread}, awayOdds=${awayOddsSpread}`);
      } else {
        console.log(`  - No spread data available in game odds`);
        // Use default values
        homeSpreadValue = -1.5;
        awaySpreadValue = 1.5;
      }
      
      // Determine recommended side based on prediction value
      // Positive prediction value means take the underdog (plus points)
      // Negative or zero prediction value means take the favorite (minus points)
      if (prediction.predictionValue > 0) {
        return `${game.awayTeamName} ${awaySpreadValue > 0 ? '+' : ''}${awaySpreadValue}`;
      } else {
        return `${game.homeTeamName} ${homeSpreadValue > 0 ? '+' : ''}${homeSpreadValue}`;
      }
      
    case 'MONEYLINE':
      // Get actual moneyline odds if available
      let homeOdds = 0;
      let awayOdds = 0;
      
      if (game.odds?.moneyline) {
        homeOdds = game.odds.moneyline.homeOdds || 0;
        awayOdds = game.odds.moneyline.awayOdds || 0;
        console.log(`  - Found moneyline data: homeOdds=${homeOdds}, awayOdds=${awayOdds}`);
      } else {
        console.log(`  - No moneyline data available in game odds`);
        if (prediction.predictionValue < 0) {
          homeOdds = prediction.predictionValue;
          awayOdds = Math.abs(prediction.predictionValue) * 0.9;
        } else {
          awayOdds = prediction.predictionValue;
          homeOdds = -Math.abs(prediction.predictionValue) * 1.1;
        }
      }
      
      // Determine recommended team based on prediction value
      // Negative prediction value indicates home team is favored
      // Positive prediction value indicates away team is favored
      if (prediction.predictionValue < 0) {
        return `${game.homeTeamName} ${homeOdds > 0 ? '+' : ''}${homeOdds}`;
      } else {
        return `${game.awayTeamName} ${awayOdds > 0 ? '+' : ''}${awayOdds}`;
      }
      
    case 'TOTAL':
      // Get actual total value from odds if available
      let totalValue = 0;
      let overOdds = -110;
      let underOdds = -110;
      
      if (game.odds?.total) {
        totalValue = game.odds.total.overUnder || 0;
        overOdds = game.odds.total.overOdds || -110;
        underOdds = game.odds.total.underOdds || -110;
        console.log(`  - Found total data: overUnder=${totalValue}, overOdds=${overOdds}, underOdds=${underOdds}`);
      } else {
        console.log(`  - No total data available in game odds`);
        // Use a default value if no total is available
        totalValue = game.sport === 'MLB' ? 8.5 : 220.5;
        console.log(`  - Using default total value for ${game.sport}: ${totalValue}`);
      }
      
      // Determine over/under recommendation
      // Positive prediction value indicates OVER
      // Negative prediction value indicates UNDER
      if (prediction.predictionValue >= 0) {
        return `OVER ${totalValue} (${overOdds > 0 ? '+' : ''}${overOdds})`;
      } else {
        return `UNDER ${totalValue} (${underOdds > 0 ? '+' : ''}${underOdds})`;
      }
      
    default:
      return prediction.predictionValue?.toString() || 'N/A';
  }
}

async function createReadableOutput(games: Game[]) {
  let output = '';
  
  // Add yesterday's results
  const yesterdaysResults = await getYesterdaysResults();
  output += formatResultsSummary(yesterdaysResults);
  output += '\n\n';
  
  if (games.length === 0) {
    output += 'No games found for today.\n';
    return output;
  }
  
  // Group games by sport
  const gamesBySport = games.reduce((acc, game) => {
    const sport = game.sport || 'UNKNOWN';
    if (!acc[sport]) {
      acc[sport] = [];
    }
    acc[sport].push(game);
    return acc;
  }, {} as Record<string, Game[]>);
  
  // Process each sport's games
  for (const [sport, sportGames] of Object.entries(gamesBySport)) {
    output += `${sport} Games\n`;
    output += '='.repeat(sport.length + 6) + '\n\n';
    
    // Sort games by start time
    sportGames.sort((a, b) => {
      const timeA = new Date(a.gameDate).getTime();
      const timeB = new Date(b.gameDate).getTime();
      return timeA - timeB;
    });
    
    // Process each game
    for (const game of sportGames) {
      const predictions = getBestPredictions(game);
      if (predictions.length > 0) {
        output += `${game.awayTeamName} @ ${game.homeTeamName}\n`;
        output += `Game time: ${format(new Date(game.gameDate), 'h:mm a')}\n\n`;
        
        for (const prediction of predictions) {
          const formattedValue = formatPredictionValue(prediction, game);
          const analysis = generateAnalysis(prediction, game);
          
          output += `${prediction.predictionType}: ${formattedValue}\n`;
          output += `Confidence: ${(prediction.enhancedConfidence * 100).toFixed(1)}%\n`;
          if (prediction.warning) {
            output += `Warning: ${prediction.warning}\n`;
          }
          output += `Analysis: ${analysis}\n\n`;
        }
        
        output += '-'.repeat(40) + '\n\n';
      }
    }
  }
  
  return output;
}

// Function to generate analysis for high-confidence predictions
function generateAnalysis(prediction, game) {
  let analysis = '';
  
  // Log odds data if available for debugging
  if (game.odds) {
    console.log(`Game odds for ${game.homeTeamName} vs ${game.awayTeamName}:`, JSON.stringify(game.odds, null, 2));
  }
  
  // General factors that influence confidence
  const factors = [
    `${game.homeTeamName}'s home record`,
    `${game.awayTeamName}'s away performance`,
    'recent form',
    'head-to-head matchups',
    'key player metrics'
  ];
  
  // Sport-specific analysis
  if (game.sport === 'MLB') {
    switch (prediction.predictionType) {
      case 'SPREAD':
        analysis = `Strong value on run line based on pitching matchup and ${prediction.confidence >= 80 ? 'significant' : 'notable'} team strength differentials.`;
        break;
      case 'MONEYLINE':
        analysis = `${prediction.confidence >= 85 ? 'Very high' : 'High'} win probability factoring in pitching advantage, batting metrics, and home/away splits.`;
        break;
      case 'TOTAL':
        analysis = `${prediction.confidence >= 85 ? 'Strong' : 'Solid'} trend indicates ${prediction.predictionValue > 0 ? 'offensive output will exceed' : 'pitching will contain scoring below'} the line.`;
        break;
    }
  } else if (game.sport === 'NBA') {
    switch (prediction.predictionType) {
      case 'SPREAD':
        analysis = `${prediction.confidence >= 85 ? 'Exceptional' : 'Strong'} value against the spread based on offensive/defensive efficiency ratings and matchup advantages.`;
        break;
      case 'MONEYLINE':
        analysis = `${prediction.confidence >= 85 ? 'Compelling' : 'Favorable'} win projection supported by net rating differentials and ${prediction.confidence >= 80 ? 'significant' : 'measurable'} statistical advantages.`;
        break;
      case 'TOTAL':
        analysis = `Projected pace and efficiency metrics ${prediction.confidence >= 85 ? 'strongly' : 'likely to'} push score ${prediction.predictionValue > 0 ? 'above' : 'below'} the total.`;
        break;
    }
  }
  
  return analysis;
}

// Main execution flow
async function main() {
  try {
    // Get yesterday's results
    const yesterdaysResults = await getYesterdaysResults();
    const resultsSummary = formatResultsSummary(yesterdaysResults);
    
    // Fetch MLB games
    console.log('Fetching MLB games...');
    const mlbGames = await fetchGames('MLB') as Game[];
    
    // Fetch NBA games
    console.log('Fetching NBA games...');
    const nbaGames = await fetchGames('NBA') as Game[];
    
    // Combine all games
    const allGames = [...mlbGames, ...nbaGames];
    console.log(`Fetched ${allGames.length} total games (${mlbGames.length} MLB, ${nbaGames.length} NBA)`);
    
    // Filter for today's games
    const todaysGames = filterTodaysGames(allGames);
    console.log(`Found ${todaysGames.length} games scheduled for today`);
    
    // Create readable output
    const output = await createReadableOutput(todaysGames);
    
    // Write to file
    const outputPath = path.join(__dirname, 'todays-picks.txt');
    fs.writeFileSync(outputPath, output);
    console.log(`Today's picks saved to ${outputPath}`);
    
  } catch (error) {
    console.error('Error in main:', error);
  }
}

async function fetchGamesWithOdds(sport: string | null = null) {
  const games = await fetchGames(sport) as Game[];
  return games.map(game => {
    if (typeof game.odds === 'string') {
      try {
        game.odds = JSON.parse(game.odds);
      } catch (e) {
        console.log(`Failed to parse odds for game ${game.id}:`, e);
      }
    }
    return game;
  });
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

// Export for potential use by other modules
export {
  fetchGames,
  fetchGamesWithOdds,
  filterTodaysGames,
  getBestPredictions,
  formatPredictionValue,
  createReadableOutput,
  main
};