import { PrismaClient, PredictionType, PredictionOutcome, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePredictionOutcomes() {
  // Get all completed games with pending predictions
  const gamesWithPendingPredictions = await prisma.game.findMany({
    where: {
      status: 'FINAL',
      predictions: {
        some: {
          outcome: 'PENDING'
        }
      }
    },
    include: {
      predictions: {
        where: {
          outcome: 'PENDING'
        }
      }
    }
  });

  console.log(`Found ${gamesWithPendingPredictions.length} completed games with pending predictions`);

  for (const game of gamesWithPendingPredictions) {
    if (game.homeScore === null || game.awayScore === null) {
      console.log(`Game ${game.id} is missing scores, skipping...`);
      continue;
    }

    for (const prediction of game.predictions) {
      let outcome: PredictionOutcome = 'PENDING';

      switch (prediction.predictionType) {
        case 'MONEYLINE':
          // For moneyline, prediction value is the team ID that was picked to win
          const predictedTeamIsHome = prediction.predictionValue === game.homeTeamId.toString();
          const homeTeamWon = game.homeScore > game.awayScore;
          outcome = (predictedTeamIsHome && homeTeamWon) || (!predictedTeamIsHome && !homeTeamWon) ? 'WIN' : 'LOSS';
          break;

        case 'SPREAD':
          // For spread, positive number means underdog gets points, negative means favorite gives points
          const spread = parseFloat(prediction.predictionValue);
          const actualDiff = game.homeScore - game.awayScore;
          outcome = actualDiff + spread > 0 ? 'WIN' : 'LOSS';
          break;

        case 'TOTAL':
          // For total, prediction value is the over/under line
          const totalLine = parseFloat(prediction.predictionValue);
          const actualTotal = game.homeScore + game.awayScore;
          // If confidence > 0.5, it's an OVER bet, otherwise UNDER
          const isOverBet = prediction.confidence > 0.5;
          if (isOverBet) {
            outcome = actualTotal > totalLine ? 'WIN' : 'LOSS';
          } else {
            outcome = actualTotal < totalLine ? 'WIN' : 'LOSS';
          }
          break;
      }

      // Update the prediction outcome
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { outcome }
      });

      console.log(`Updated prediction ${prediction.id} for game ${game.id} to ${outcome}`);
    }
  }
}

async function main() {
  try {
    await updatePredictionOutcomes();
    console.log('Successfully updated prediction outcomes');
  } catch (error) {
    console.error('Error updating prediction outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 