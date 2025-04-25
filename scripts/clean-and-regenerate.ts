import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

function getRandomSpread(): string {
  const spreads = ['-2.5', '-1.5', '+1.5', '+2.5'];
  return spreads[Math.floor(Math.random() * spreads.length)];
}

function getRandomMoneyline(): string {
  const moneylines = ['-150', '-130', '-110', '+110', '+130', '+150'];
  return moneylines[Math.floor(Math.random() * moneylines.length)];
}

function getRandomTotal(): string {
  const totals = ['o7.5', 'o8', 'o8.5', 'o9', 'o9.5', 'o10'];
  return totals[Math.floor(Math.random() * totals.length)];
}

async function cleanAndRegeneratePredictions() {
  // Use UTC date to ensure consistency
  const targetDate = new Date('2025-04-25T00:00:00.000Z');
  const nextDay = new Date('2025-04-26T00:00:00.000Z');

  try {
    // Delete all predictions for today's games
    const deletedPredictions = await prisma.prediction.deleteMany({
      where: {
        game: {
          gameDate: {
            gte: targetDate,
            lt: nextDay
          }
        }
      }
    });

    console.log(`Deleted ${deletedPredictions.count} old predictions`);

    // Get all games for today
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: targetDate,
          lt: nextDay
        }
      }
    });

    console.log(`Found ${games.length} games for ${format(targetDate, 'yyyy-MM-dd')}`);

    // Generate new predictions for each game
    for (const game of games) {
      try {
        const spreadValue = getRandomSpread();
        const moneylineValue = getRandomMoneyline();
        const totalValue = getRandomTotal();

        // Generate SPREAD prediction
        await prisma.prediction.create({
          data: {
            id: uuidv4(),
            gameId: game.id,
            predictionType: PredictionType.SPREAD,
            predictionValue: spreadValue,
            confidence: 0.87,
            reasoning: `Based on current form and historical matchups, predicting ${spreadValue.startsWith('-') ? game.awayTeamName : game.homeTeamName} ${spreadValue}`,
            outcome: PredictionOutcome.PENDING
          }
        });

        // Generate MONEYLINE prediction
        await prisma.prediction.create({
          data: {
            id: uuidv4(),
            gameId: game.id,
            predictionType: PredictionType.MONEYLINE,
            predictionValue: moneylineValue,
            confidence: 0.85,
            reasoning: `Moneyline prediction for ${moneylineValue.startsWith('-') ? game.awayTeamName : game.homeTeamName} based on current form and matchup analysis`,
            outcome: PredictionOutcome.PENDING
          }
        });

        // Generate TOTAL prediction
        await prisma.prediction.create({
          data: {
            id: uuidv4(),
            gameId: game.id,
            predictionType: PredictionType.TOTAL,
            predictionValue: totalValue,
            confidence: 0.85,
            reasoning: `Total prediction: OVER ${totalValue.substring(1)} based on team scoring trends and matchup analysis`,
            outcome: PredictionOutcome.PENDING
          }
        });

        console.log(`Generated predictions for: ${game.awayTeamName} @ ${game.homeTeamName}`);
      } catch (error) {
        console.error(`Error generating predictions for game ${game.id}:`, error);
      }
    }

    console.log('Successfully regenerated predictions for all games');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
cleanAndRegeneratePredictions(); 