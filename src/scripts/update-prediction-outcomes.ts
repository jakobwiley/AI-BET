import { prisma } from '../lib/prisma.ts';
import { SportsApiService } from '../lib/sportsApi.ts';
import type { Game, Prediction, PredictionType, PredictionOutcome } from '@prisma/client';

async function updatePredictionOutcomes() {
  console.log('Starting prediction outcomes update...');

  // Get all pending predictions for completed games
  const pendingPredictions = await prisma.prediction.findMany({
    where: {
      outcome: 'PENDING',
      game: {
        status: 'FINAL'
      }
    },
    include: {
      game: true
    }
  });

  console.log(`Found ${pendingPredictions.length} pending predictions to evaluate`);

  for (const prediction of pendingPredictions) {
    try {
      const outcome = await evaluatePrediction(prediction);
      
      // Update the prediction with the outcome
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: {
          outcome,
          updatedAt: new Date()
        }
      });

      console.log(`Updated prediction ${prediction.id} with outcome: ${outcome}`);
    } catch (error) {
      console.error(`Error evaluating prediction ${prediction.id}:`, error);
    }
  }

  console.log('Finished updating prediction outcomes');
}

async function evaluatePrediction(prediction: Prediction & { game: Game }): Promise<PredictionOutcome> {
  const { predictionType, predictionValue, game } = prediction;
  const homeScore = game.homeScore;
  const awayScore = game.awayScore;

  if (homeScore === null || awayScore === null) {
    throw new Error('Game scores not available');
  }

  switch (predictionType) {
    case 'SPREAD': {
      const predictedSpread = parseFloat(predictionValue);
      const actualSpread = homeScore - awayScore;
      const spreadWithPrediction = actualSpread - predictedSpread;
      
      if (spreadWithPrediction > 0) return 'WIN';
      if (spreadWithPrediction < 0) return 'LOSS';
      return 'PUSH';
    }

    case 'MONEYLINE': {
      const predictedOdds = parseInt(predictionValue);
      const isHomeWin = homeScore > awayScore;
      
      // Convert American odds to probability
      const predictedProb = predictedOdds > 0 
        ? 100 / (predictedOdds + 100)
        : Math.abs(predictedOdds) / (Math.abs(predictedOdds) + 100);
      
      // If predicted probability > 0.5, we predicted home win
      const predictedHomeWin = predictedProb > 0.5;
      
      if (isHomeWin === predictedHomeWin) return 'WIN';
      return 'LOSS';
    }

    case 'TOTAL': {
      const predictedTotal = parseFloat(predictionValue);
      const actualTotal = homeScore + awayScore;
      
      if (actualTotal > predictedTotal) return 'WIN';
      if (actualTotal < predictedTotal) return 'LOSS';
      return 'PUSH';
    }

    default:
      throw new Error(`Unsupported prediction type: ${predictionType}`);
  }
}

// Run the update
updatePredictionOutcomes()
  .then(() => {
    console.log('Successfully updated prediction outcomes');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating prediction outcomes:', error);
    process.exit(1);
  }); 