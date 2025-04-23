#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const CONFIDENCE_THRESHOLD = 65; // Only show predictions with confidence >= 65%

async function fetchGames(sport = null) {
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

function filterTodaysGames(games) {
  const today = new Date();
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
  
  // Group predictions by type
  const predictionsByType = game.predictions.reduce((acc, prediction) => {
    if (!acc[prediction.predictionType]) {
      acc[prediction.predictionType] = [];
    }
    acc[prediction.predictionType].push(prediction);
    return acc;
  }, {});
  
  // For each type, get the highest confidence prediction
  return Object.keys(predictionsByType).map(type => {
    const predictions = predictionsByType[type];
    return predictions.sort((a, b) => b.confidence - a.confidence)[0];
  }).filter(prediction => prediction.confidence >= CONFIDENCE_THRESHOLD);
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

function createReadableOutput(games) {
  let output = '';
  
  if (games.length === 0) {
    return 'No games found for today.';
  }
  
  output += `TODAY'S TOP PREDICTIONS (${format(new Date(), 'MMM d, yyyy')})\n`;
  output += '==============================================\n\n';
  
  // Group games by sport
  const gamesBySport = games.reduce((acc, game) => {
    if (!acc[game.sport]) {
      acc[game.sport] = [];
    }
    acc[game.sport].push(game);
    return acc;
  }, {});
  
  Object.keys(gamesBySport).forEach(sport => {
    output += `${sport} GAMES\n`;
    output += '--------------\n\n';
    
    gamesBySport[sport].forEach(game => {
      const bestPredictions = getBestPredictions(game);
      
      if (bestPredictions.length === 0) {
        return;
      }
      
      const gameTime = format(new Date(game.gameDate), 'h:mm a');
      output += `${game.awayTeamName} @ ${game.homeTeamName} - ${gameTime}\n`;
      
      // Check if game has odds for debugging
      if (!game.odds) {
        output += `  (No odds available for this game)\n`;
      }
      
      bestPredictions.forEach(prediction => {
        const formattedValue = formatPredictionValue(prediction, game);
        const predictionTypeStr = `${prediction.predictionType}:`.padEnd(10);
        output += `  ${predictionTypeStr} ${formattedValue.padEnd(25)} | `;
        output += `Confidence: ${typeof prediction.confidence === 'number' ? prediction.confidence.toFixed(1) : prediction.confidence}% | Grade: ${prediction.grade}\n`;
        
        // Add detailed analysis for high-confidence predictions
        if (prediction.confidence >= 75 || (prediction.grade && prediction.grade.startsWith('A') || prediction.grade === 'B+')) {
          output += `    Analysis: ${generateAnalysis(prediction, game)}\n`;
        }
      });
      
      output += '\n';
    });
    
    output += '\n';
  });
  
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
    console.log('Fetching MLB games...');
    const mlbGames = await fetchGamesWithOdds('MLB');
    
    console.log('Fetching NBA games...');
    const nbaGames = await fetchGamesWithOdds('NBA');
    
    const allGames = [...mlbGames, ...nbaGames];
    console.log(`Fetched ${allGames.length} total games (${mlbGames.length} MLB, ${nbaGames.length} NBA)`);
    
    const todaysGames = filterTodaysGames(allGames);
    console.log(`Found ${todaysGames.length} games scheduled for today`);
    
    // Log any games with missing odds
    const gamesWithoutOdds = todaysGames.filter(game => !game.odds);
    if (gamesWithoutOdds.length > 0) {
      console.log(`Warning: ${gamesWithoutOdds.length} games are missing odds data:`);
      gamesWithoutOdds.forEach(game => {
        console.log(`  - ${game.awayTeamName} @ ${game.homeTeamName} (${game.id})`);
      });
    }
    
    // Create readable output
    const output = createReadableOutput(todaysGames);
    
    // Save to file
    const filePath = path.join(__dirname, 'todays-picks.txt');
    fs.writeFileSync(filePath, output);
    console.log(`Today's picks saved to ${filePath}`);
    
    return todaysGames;
  } catch (error) {
    console.error('Error in main:', error);
    return [];
  }
}

// Helper function to ensure each game has valid odds data
async function fetchGamesWithOdds(sport = null) {
  try {
    const url = sport ? `${API_BASE_URL}/games?sport=${sport}` : `${API_BASE_URL}/games`;
    console.log(`Fetching games from: ${url}`);
    const response = await axios.get(url);
    const games = response.data;
    
    // Process and normalize odds data for each game
    return games.map(game => {
      // First check if game.odds exists
      if (!game.odds) {
        // Try to parse oddsJson if available
        if (game.oddsJson) {
          try {
            if (typeof game.oddsJson === 'string') {
              game.odds = JSON.parse(game.oddsJson);
            } else {
              game.odds = game.oddsJson;
            }
            console.log(`Game ${game.id}: Parsed odds from oddsJson`);
          } catch (e) {
            console.log(`Game ${game.id}: Failed to parse oddsJson - ${e.message}`);
          }
        }
      }
      
      // Create default odds structure if still missing
      if (!game.odds) {
        game.odds = {
          spread: {
            homeSpread: game.sport === 'MLB' ? -1.5 : -7.5,
            awaySpread: game.sport === 'MLB' ? 1.5 : 7.5,
            homeOdds: -110,
            awayOdds: -110
          },
          moneyline: {
            homeOdds: -130,
            awayOdds: 110
          },
          total: {
            overUnder: game.sport === 'MLB' ? 8.5 : 220.5,
            overOdds: -110,
            underOdds: -110
          }
        };
        console.log(`Game ${game.id}: Created default odds structure`);
      }
      
      return game;
    });
  } catch (error) {
    console.error('Error fetching games:', error.message);
    return [];
  }
}

// Execute main function
if (require.main === module) {
  main().then(() => {
    console.log('Finished generating picks');
  }).catch(err => {
    console.error('Error generating picks:', err);
  });
}

// Export for potential use by other modules
module.exports = {
  fetchGames,
  fetchGamesWithOdds,
  filterTodaysGames,
  getBestPredictions,
  formatPredictionValue,
  createReadableOutput,
  main
};