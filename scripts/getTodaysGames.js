const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to properly format team names
function formatTeamName(game) {
  return {
    homeTeam: game.homeTeamName || 'Unknown Home Team',
    awayTeam: game.awayTeamName || 'Unknown Away Team'
  };
}

// Helper function to properly format prediction details
function formatPrediction(pred) {
  return {
    type: pred.predictionType || 'UNKNOWN',
    value: pred.predictionValue || 0,
    confidence: typeof pred.confidence === 'number' ? 
      pred.confidence <= 1 ? Math.round(pred.confidence * 100) : Math.round(pred.confidence) 
      : 0,
    grade: calculateGrade(pred.confidence) 
  };
}

// Calculate grade based on confidence
function calculateGrade(confidence) {
  // Convert to 0-1 scale if needed
  const normalizedConfidence = confidence > 1 ? confidence / 100 : confidence;
  
  if (normalizedConfidence >= 0.9) return 'A+';
  if (normalizedConfidence >= 0.85) return 'A';
  if (normalizedConfidence >= 0.8) return 'A-';
  if (normalizedConfidence >= 0.75) return 'B+';
  if (normalizedConfidence >= 0.7) return 'B';
  if (normalizedConfidence >= 0.65) return 'B-';
  if (normalizedConfidence >= 0.6) return 'C+';
  if (normalizedConfidence >= 0.55) return 'C';
  return 'D';
}

async function main() {
  try {
    console.log('Fetching today\'s MLB and NBA games with odds...\n');
    
    // Get today's date (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date (midnight)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Fetch NBA games scheduled for today
    const nbaGames = await prisma.game.findMany({
      where: {
        sport: 'NBA',
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });
    
    // Fetch MLB games scheduled for today
    const mlbGames = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });
    
    // Display NBA Games
    console.log(`\n🏀 NBA GAMES (${nbaGames.length} games found for today):`);
    console.log('═════════════════════════════════════════════════');
    if (nbaGames.length === 0) {
      console.log('No NBA games scheduled for today.');
    } else {
      nbaGames.forEach((game, index) => {
        const teams = formatTeamName(game);
        console.log(`Game ${index + 1}: ${teams.awayTeam} @ ${teams.homeTeam}`);
        console.log(`ID: ${game.id}`);
        console.log(`Time: ${new Date(game.gameDate).toLocaleTimeString()}`);
        console.log(`Status: ${game.status}`);
        
        // Parse and display odds if available
        let odds = {};
        try {
          // Check if oddsJson is a string that needs parsing, or already an object
          if (game.oddsJson) {
            if (typeof game.oddsJson === 'string') {
              odds = JSON.parse(game.oddsJson);
            } else {
              odds = game.oddsJson;
            }
          }
        } catch (e) {
          console.log(`Error parsing odds: ${e.message}`);
        }
        
        // Display the odds in a more detailed way
        console.log('Odds: ');
        if (Object.keys(odds).length === 0) {
          console.log('  No odds available');
        } else {
          if (odds.spread) {
            console.log(`  Spread: ${teams.homeTeam} ${odds.spread.value || 'N/A'} (${odds.spread.odds || 'N/A'})`);
          }
          
          if (odds.moneyline) {
            console.log(`  Moneyline: ${teams.homeTeam} ${odds.moneyline?.home || 'N/A'}, ${teams.awayTeam} ${odds.moneyline?.away || 'N/A'}`);
          }
          
          if (odds.total) {
            console.log(`  Total: O/U ${odds.total?.value || 'N/A'} (Over: ${odds.total?.over || 'N/A'}, Under: ${odds.total?.under || 'N/A'})`);
          }
        }
        
        // Display predictions if available
        if (game.predictions && game.predictions.length > 0) {
          console.log('Predictions:');
          game.predictions.forEach(pred => {
            const formattedPred = formatPrediction(pred);
            console.log(`  - ${formattedPred.type}: ${formattedPred.value} (Confidence: ${formattedPred.confidence}%, Grade: ${formattedPred.grade})`);
          });
        } else {
          console.log('No predictions available');
        }
        
        console.log('───────────────────────────────────────────────');
      });
    }
    
    // Display MLB Games
    console.log(`\n⚾ MLB GAMES (${mlbGames.length} games found for today):`);
    console.log('═════════════════════════════════════════════════');
    if (mlbGames.length === 0) {
      console.log('No MLB games scheduled for today.');
    } else {
      mlbGames.forEach((game, index) => {
        const teams = formatTeamName(game);
        console.log(`Game ${index + 1}: ${teams.awayTeam} @ ${teams.homeTeam}`);
        console.log(`ID: ${game.id}`);
        console.log(`Time: ${new Date(game.gameDate).toLocaleTimeString()}`);
        console.log(`Status: ${game.status}`);
        
        // Parse and display odds if available
        let odds = {};
        try {
          // Check if oddsJson is a string that needs parsing, or already an object
          if (game.oddsJson) {
            if (typeof game.oddsJson === 'string') {
              odds = JSON.parse(game.oddsJson);
            } else {
              odds = game.oddsJson;
            }
          }
        } catch (e) {
          console.log(`Error parsing odds: ${e.message}`);
        }
        
        // Display the odds in a more detailed way
        console.log('Odds: ');
        if (Object.keys(odds).length === 0) {
          console.log('  No odds available');
        } else {
          if (odds.spread) {
            console.log(`  Spread (Run Line): ${teams.homeTeam} ${odds.spread.value || 'N/A'} (${odds.spread.odds || 'N/A'})`);
          }
          
          if (odds.moneyline) {
            console.log(`  Moneyline: ${teams.homeTeam} ${odds.moneyline?.home || 'N/A'}, ${teams.awayTeam} ${odds.moneyline?.away || 'N/A'}`);
          }
          
          if (odds.total) {
            console.log(`  Total: O/U ${odds.total?.value || 'N/A'} (Over: ${odds.total?.over || 'N/A'}, Under: ${odds.total?.under || 'N/A'})`);
          }
        }
        
        // Display predictions if available
        if (game.predictions && game.predictions.length > 0) {
          console.log('Predictions:');
          game.predictions.forEach(pred => {
            const formattedPred = formatPrediction(pred);
            console.log(`  - ${formattedPred.type}: ${formattedPred.value} (Confidence: ${formattedPred.confidence}%, Grade: ${formattedPred.grade})`);
          });
        } else {
          console.log('No predictions available');
        }
        
        console.log('───────────────────────────────────────────────');
      });
    }
    
  } catch (error) {
    console.error('Error fetching games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 