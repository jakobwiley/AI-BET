import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

// Helper function to properly format team names
function formatTeamName(game) {
  return `${game.awayTeamName} @ ${game.homeTeamName}`;
}

// Helper function to properly format odds
function formatOdds(odds) {
  if (!odds) return 'Not available';
  
  const formattedOdds = {};
  
  if (odds.spread) {
    formattedOdds.spread = `${odds.spread.away > 0 ? '+' : ''}${odds.spread.away} (${odds.spread.point}) | ${odds.spread.home > 0 ? '+' : ''}${odds.spread.home} (${odds.spread.point})`;
  }
  
  if (odds.total) {
    formattedOdds.total = `O/U ${odds.total.over} (O: ${odds.total.point} | U: ${odds.total.under})`;
  }
  
  if (odds.moneyline) {
    formattedOdds.moneyline = `${odds.moneyline.away} | ${odds.moneyline.home}`;
  }
  
  return formattedOdds;
}

// Helper function to properly format prediction details
function formatPrediction(pred) {
  let formattedValue = pred.predictionValue;
  
  switch (pred.predictionType) {
    case 'SPREAD':
      formattedValue = `${formattedValue > 0 ? '+' : ''}${formattedValue}`;
      break;
    case 'TOTAL':
      formattedValue = formattedValue > 0 ? 'OVER' : 'UNDER';
      break;
    case 'MONEYLINE':
      formattedValue = formattedValue > 0 ? 'HOME' : 'AWAY';
      break;
  }
  
  return {
    type: pred.predictionType,
    value: formattedValue,
    confidence: Math.round(pred.confidence * 100),
    grade: pred.grade || calculateGrade(pred.confidence),
    reasoning: pred.reasoning
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
        console.log(`\nGame ${index + 1}: ${teams}`);
        console.log(`Time: ${game.startTime || 'TBD'}`);
        
        // Display odds if available
        if (game.oddsJson) {
          const odds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
          const formattedOdds = formatOdds(odds);
          console.log('Odds:');
          if (formattedOdds.spread) console.log(`  Spread: ${formattedOdds.spread}`);
          if (formattedOdds.total) console.log(`  Total: ${formattedOdds.total}`);
          if (formattedOdds.moneyline) console.log(`  Moneyline: ${formattedOdds.moneyline}`);
        } else {
          console.log('No odds available');
        }
        
        // Display predictions if available
        if (game.predictions && game.predictions.length > 0) {
          console.log('Predictions:');
          game.predictions.forEach(pred => {
            const formattedPred = formatPrediction(pred);
            console.log(`  - ${formattedPred.type}: ${formattedPred.value} (Confidence: ${formattedPred.confidence}%, Grade: ${formattedPred.grade})`);
            if (formattedPred.reasoning) {
              console.log(`    Reasoning: ${formattedPred.reasoning}`);
            }
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
        console.log(`\nGame ${index + 1}: ${teams}`);
        console.log(`Time: ${game.startTime || 'TBD'}`);
        
        // Display odds if available
        if (game.oddsJson) {
          const odds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
          const formattedOdds = formatOdds(odds);
          console.log('Odds:');
          if (formattedOdds.spread) console.log(`  Spread: ${formattedOdds.spread}`);
          if (formattedOdds.total) console.log(`  Total: ${formattedOdds.total}`);
          if (formattedOdds.moneyline) console.log(`  Moneyline: ${formattedOdds.moneyline}`);
        } else {
          console.log('No odds available');
        }
        
        // Display predictions if available
        if (game.predictions && game.predictions.length > 0) {
          console.log('Predictions:');
          game.predictions.forEach(pred => {
            const formattedPred = formatPrediction(pred);
            console.log(`  - ${formattedPred.type}: ${formattedPred.value} (Confidence: ${formattedPred.confidence}%, Grade: ${formattedPred.grade})`);
            if (formattedPred.reasoning) {
              console.log(`    Reasoning: ${formattedPred.reasoning}`);
            }
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

main().catch(console.error); 