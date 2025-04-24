import { PrismaClient, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePendingPredictions() {
  try {
    // Get all pending predictions with their associated games
    const pendingPredictions = await prisma.prediction.findMany({
      where: {
        outcome: PredictionOutcome.PENDING
      },
      include: {
        game: true
      },
      orderBy: {
        game: {
          gameDate: 'asc'
        }
      }
    });

    console.log(`\nFound ${pendingPredictions.length} pending predictions\n`);

    // Group predictions by game date
    const predictionsByDate: { [key: string]: typeof pendingPredictions } = {};
    pendingPredictions.forEach(pred => {
      const dateKey = pred.game.gameDate.toISOString().split('T')[0];
      if (!predictionsByDate[dateKey]) {
        predictionsByDate[dateKey] = [];
      }
      predictionsByDate[dateKey].push(pred);
    });

    // Print predictions grouped by date
    Object.keys(predictionsByDate).sort().forEach(date => {
      const predictions = predictionsByDate[date];
      console.log(`\nDate: ${date}`);
      console.log('----------------------------------------');
      
      // Group by game
      const predictionsByGame: { [key: string]: typeof pendingPredictions } = {};
      predictions.forEach(pred => {
        const gameKey = `${pred.game.awayTeamName} @ ${pred.game.homeTeamName}`;
        if (!predictionsByGame[gameKey]) {
          predictionsByGame[gameKey] = [];
        }
        predictionsByGame[gameKey].push(pred);
      });

      // Print predictions for each game
      Object.keys(predictionsByGame).forEach(game => {
        const gamePredictions = predictionsByGame[game];
        console.log(`\nGame: ${game}`);
        console.log(`Status: ${gamePredictions[0].game.status}`);
        if (gamePredictions[0].game.homeScore !== null) {
          console.log(`Score: ${gamePredictions[0].game.awayScore}-${gamePredictions[0].game.homeScore}`);
        }
        console.log('Predictions:');
        gamePredictions.forEach(pred => {
          console.log(`- ${pred.predictionType}: ${pred.predictionValue} (${(pred.confidence * 100).toFixed(0)}% confidence)`);
        });
      });
    });

    // Summary by prediction type
    console.log('\nPending Predictions by Type:');
    console.log('----------------------------------------');
    const typeCount: { [key: string]: number } = {};
    pendingPredictions.forEach(pred => {
      typeCount[pred.predictionType] = (typeCount[pred.predictionType] || 0) + 1;
    });
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

  } catch (error) {
    console.error('Error analyzing pending predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePendingPredictions().catch(console.error); 