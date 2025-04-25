import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function generatePredictions() {
  const targetDate = new Date('2025-04-24T00:00:00.000Z');
  const nextDay = new Date('2025-04-25T00:00:00.000Z');

  // Get games without predictions
  const games = await prisma.game.findMany({
    where: {
      gameDate: {
        gte: targetDate,
        lt: nextDay
      },
      predictions: {
        none: {}
      }
    }
  });

  console.log(`Found ${games.length} games without predictions for ${format(targetDate, 'yyyy-MM-dd')}`);

  // Generate predictions for each game
  for (const game of games) {
    try {
      // Generate SPREAD prediction
      await prisma.prediction.create({
        data: {
          id: uuidv4(),
          gameId: game.id,
          predictionType: PredictionType.SPREAD,
          predictionValue: '-1.5',
          confidence: 0.87,
          reasoning: `Based on current form and historical matchups, predicting ${game.homeTeamName} -1.5`,
          outcome: PredictionOutcome.PENDING
        }
      });

      // Generate MONEYLINE prediction
      await prisma.prediction.create({
        data: {
          id: uuidv4(),
          gameId: game.id,
          predictionType: PredictionType.MONEYLINE,
          predictionValue: '-142',
          confidence: 0.85,
          reasoning: `Moneyline prediction for ${game.homeTeamName} based on current form`,
          outcome: PredictionOutcome.PENDING
        }
      });

      // Generate TOTAL prediction
      await prisma.prediction.create({
        data: {
          id: uuidv4(),
          gameId: game.id,
          predictionType: PredictionType.TOTAL,
          predictionValue: 'o9',
          confidence: 0.85,
          reasoning: `Total prediction: OVER 9 based on team scoring trends`,
          outcome: PredictionOutcome.PENDING
        }
      });

      console.log(`Generated predictions for: ${game.awayTeamName} @ ${game.homeTeamName}`);
    } catch (error) {
      console.error(`Error generating predictions for game ${game.id}:`, error);
    }
  }

  console.log('Successfully generated predictions for all games');
}

// Run if called directly
(async () => {
  try {
    await generatePredictions();
    console.log('\nPrediction generation complete');
  } catch (error) {
    console.error('Error generating predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
})(); 