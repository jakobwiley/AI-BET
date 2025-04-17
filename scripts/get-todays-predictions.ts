import pkg from '@prisma/client';
const { PrismaClient, SportType, PredictionType } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function getTodaysPredictions() {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date at midnight
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all MLB games for today
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    console.log(`Found ${games.length} MLB games for today (${today.toLocaleDateString()}):\n`);

    // Get predictions for each game
    for (const game of games) {
      console.log(`${game.homeTeamName} vs ${game.awayTeamName} (${new Date(game.gameDate).toLocaleTimeString()})`);
      
      try {
        const predictions = await prisma.prediction.findMany({
          where: {
            gameId: game.id
          }
        });
        
        if (predictions.length === 0) {
          console.log('  No predictions available for this game.\n');
          continue;
        }

        predictions.forEach((pred) => {
          const predictionType = pred.predictionType === PredictionType.MONEYLINE ? 'Winner' :
                                pred.predictionType === PredictionType.SPREAD ? 'Spread' : 'Over/Under';
          
          const predictionValue = pred.predictionType === PredictionType.MONEYLINE ? 
            (pred.predictionValue > 0 ? game.awayTeamName : game.homeTeamName) :
            pred.predictionValue.toString();
            
          console.log(`  ${predictionType}: ${predictionValue} (Confidence: ${(pred.confidence * 100).toFixed(1)}%)`);
          console.log(`  Reasoning: ${pred.reasoning}\n`);
        });
      } catch (error) {
        console.log(`  Error getting predictions: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('Error getting today\'s predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTodaysPredictions(); 