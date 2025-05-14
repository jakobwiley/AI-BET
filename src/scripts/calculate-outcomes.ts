import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

function calculateMoneylineOutcome(predictionValue: string, homeScore: number, awayScore: number, isHomeTeam: boolean): PredictionOutcome {
  // For moneyline predictions, we just need to check if the predicted team won
  const homeTeamWon = homeScore > awayScore;
  const predictedHomeTeam = isHomeTeam;

  if (homeScore === awayScore) {
    return PredictionOutcome.PUSH;
  }

  return (homeTeamWon === predictedHomeTeam) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
}

function calculateSpreadOutcome(predictionValue: string, homeScore: number, awayScore: number, isHomeTeam: boolean): PredictionOutcome {
  // Parse the spread value (negative means favorite, positive means underdog)
  const spreadValue = parseFloat(predictionValue);
  if (isNaN(spreadValue)) {
    console.error(`Invalid spread value: ${predictionValue}`);
    return PredictionOutcome.PENDING;
  }

  // Calculate the actual spread (from home team perspective)
  const actualSpread = homeScore - awayScore;
  
  // If betting on home team, they need to win by more than the spread
  // If betting on away team, they need to lose by less than the spread or win
  const adjustedSpread = isHomeTeam ? spreadValue : -spreadValue;
  const spreadCovered = actualSpread > adjustedSpread;
  const pushScenario = actualSpread === adjustedSpread;

  if (pushScenario) {
    return PredictionOutcome.PUSH;
  }

  return spreadCovered ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
}

function calculateTotalOutcome(predictionValue: string, homeScore: number, awayScore: number): PredictionOutcome {
  // Extract over/under and total value
  const isOver = predictionValue.toLowerCase().startsWith('o');
  const isUnder = predictionValue.toLowerCase().startsWith('u');
  const totalValue = parseFloat(predictionValue.substring(1));

  if (!isOver && !isUnder) {
    console.error(`Invalid total prediction format: ${predictionValue}`);
    return PredictionOutcome.PENDING;
  }

  if (isNaN(totalValue)) {
    console.error(`Invalid total value: ${predictionValue}`);
    return PredictionOutcome.PENDING;
  }

  const actualTotal = homeScore + awayScore;

  if (actualTotal === totalValue) {
    return PredictionOutcome.PUSH;
  }

  if (isOver) {
    return actualTotal > totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
  } else {
    return actualTotal < totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
  }
}

async function calculateOutcomes() {
  try {
    // Get all predictions for completed games
    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          status: 'FINAL'
        }
      },
      include: {
        game: true
      }
    });

    console.log(`Found ${predictions.length} predictions for completed games`);
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const pred of predictions) {
      if (pred.game.homeScore === null || pred.game.awayScore === null) {
        console.error(`Game ${pred.game.id} is marked as FINAL but has no scores`);
        errorCount++;
        continue;
      }

      let newOutcome: PredictionOutcome;
      const isHomeTeam = pred.game.homeTeamId === pred.gameId.split('_')[1];

      try {
        switch (pred.predictionType) {
          case PredictionType.MONEYLINE:
            newOutcome = calculateMoneylineOutcome(
              pred.predictionValue,
              pred.game.homeScore,
              pred.game.awayScore,
              isHomeTeam
            );
            break;

          case PredictionType.SPREAD:
            newOutcome = calculateSpreadOutcome(
              pred.predictionValue,
              pred.game.homeScore,
              pred.game.awayScore,
              isHomeTeam
            );
            break;

          case PredictionType.TOTAL:
            newOutcome = calculateTotalOutcome(
              pred.predictionValue,
              pred.game.homeScore,
              pred.game.awayScore
            );
            break;

          default:
            console.error(`Unknown prediction type: ${pred.predictionType}`);
            errorCount++;
            continue;
        }

        if (newOutcome !== pred.outcome) {
          await prisma.prediction.update({
            where: { id: pred.id },
            data: { outcome: newOutcome }
          });
          console.log(`Updated prediction ${pred.id}:`);
          console.log(`  Type: ${pred.predictionType}`);
          console.log(`  Value: ${pred.predictionValue}`);
          console.log(`  Old outcome: ${pred.outcome}`);
          console.log(`  New outcome: ${newOutcome}`);
          console.log('----------------------------------------');
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } catch (error) {
        console.error(`Error processing prediction ${pred.id}:`, error);
        errorCount++;
      }
    }

    console.log('\nSummary:');
    console.log(`Total predictions processed: ${predictions.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Unchanged: ${unchangedCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Error calculating outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

calculateOutcomes().catch(console.error); 