import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMlbPredictions() {
  try {
    console.log('🔄 Starting MLB prediction fixes...');

    // Get all MLB games with final status and their predictions
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        status: GameStatus.FINAL,
        predictions: {
          some: {} // Only games with predictions
        }
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${games.length} completed MLB games with predictions`);

    let fixedConfidenceCount = 0;
    let fixedOutcomeCount = 0;

    for (const game of games) {
      for (const prediction of game.predictions) {
        let shouldUpdate = false;
        const updates: any = {};

        // Fix confidence values
        if (prediction.confidence > 1) {
          updates.confidence = prediction.confidence / 100;
          fixedConfidenceCount++;
          shouldUpdate = true;
        }

        // Fix prediction outcomes
        if (game.homeScore !== null && game.awayScore !== null) {
          const currentOutcome = prediction.outcome;
          let newOutcome = currentOutcome;

          switch (prediction.predictionType) {
            case 'MONEYLINE':
              // Negative value means betting on home team, positive means away team
              const mlValue = parseFloat(prediction.predictionValue);
              if (mlValue < 0) {
                newOutcome = game.homeScore > game.awayScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else {
                newOutcome = game.awayScore > game.homeScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
              break;

            case 'SPREAD':
              const spreadValue = parseFloat(prediction.predictionValue);
              const homeScoreWithSpread = game.homeScore + spreadValue;
              newOutcome = homeScoreWithSpread > game.awayScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              break;

            case 'TOTAL':
              const totalValue = parseFloat(prediction.predictionValue);
              const totalScore = game.homeScore + game.awayScore;
              // Positive value means betting over, negative means under
              if (totalValue > 0) {
                newOutcome = totalScore > Math.abs(totalValue) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else {
                newOutcome = totalScore < Math.abs(totalValue) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
              break;
          }

          if (newOutcome !== currentOutcome) {
            updates.outcome = newOutcome;
            fixedOutcomeCount++;
            shouldUpdate = true;
          }
        }

        // Update prediction if needed
        if (shouldUpdate) {
          await prisma.prediction.update({
            where: { id: prediction.id },
            data: updates
          });
        }
      }
    }

    console.log('\n📊 Fix Summary:');
    console.log(`Fixed ${fixedConfidenceCount} confidence values`);
    console.log(`Fixed ${fixedOutcomeCount} prediction outcomes`);

  } catch (error) {
    console.error('Error fixing MLB predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fixes
fixMlbPredictions(); 