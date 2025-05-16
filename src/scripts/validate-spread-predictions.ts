import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

interface SpreadValidation {
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  predictionId: string;
  predictionValue: string;
  currentOutcome: PredictionOutcome;
  calculatedOutcome: PredictionOutcome;
  needsUpdate: boolean;
}

async function validateSpreadPredictions() {
  try {
    // Get games from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: thirtyDaysAgo
        },
        status: 'FINAL'
      },
      include: {
        predictions: {
          where: {
            predictionType: PredictionType.SPREAD
          }
        }
      }
    });

    console.log(`Analyzing ${games.length} games with spread predictions...`);

    const validations: SpreadValidation[] = [];
    let totalPredictions = 0;
    let needsUpdate = 0;

    for (const game of games) {
      if (game.homeScore === null || game.awayScore === null) {
        console.log(`⚠️ Game ${game.id} (${game.homeTeamName} vs ${game.awayTeamName}) has null scores`);
        continue;
      }

      for (const prediction of game.predictions) {
        totalPredictions++;
        const validation = await validateSpreadPrediction(game, prediction);
        validations.push(validation);
        if (validation.needsUpdate) {
          needsUpdate++;
        }
      }
    }

    // Print validation results
    console.log('\nSpread Prediction Validation Results:');
    console.log('===================================');
    console.log(`Total Predictions Analyzed: ${totalPredictions}`);
    console.log(`Predictions Needing Update: ${needsUpdate}`);
    console.log(`Update Percentage: ${((needsUpdate / totalPredictions) * 100).toFixed(1)}%`);

    // Print detailed validation issues
    console.log('\nDetailed Validation Issues:');
    console.log('=========================');
    validations
      .filter(v => v.needsUpdate)
      .forEach(v => {
        console.log(`\nGame: ${v.homeTeam} vs ${v.awayTeam} (${v.date})`);
        console.log(`Score: ${v.homeScore}-${v.awayScore}`);
        console.log(`Prediction: ${v.predictionValue}`);
        console.log(`Current Outcome: ${v.currentOutcome}`);
        console.log(`Calculated Outcome: ${v.calculatedOutcome}`);
      });

    // Update predictions if needed
    if (needsUpdate > 0) {
      console.log('\nUpdating predictions...');
      for (const validation of validations) {
        if (validation.needsUpdate) {
          await prisma.prediction.update({
            where: { id: validation.predictionId },
            data: { outcome: validation.calculatedOutcome }
          });
        }
      }
      console.log('Updates completed.');
    }

  } catch (error) {
    console.error('Error validating spread predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateSpreadPrediction(game: any, prediction: any): Promise<SpreadValidation> {
  const validation: SpreadValidation = {
    gameId: game.id,
    date: game.gameDate.toISOString().split('T')[0],
    homeTeam: game.homeTeamName,
    awayTeam: game.awayTeamName,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    predictionId: prediction.id,
    predictionValue: prediction.predictionValue,
    currentOutcome: prediction.outcome,
    calculatedOutcome: PredictionOutcome.PENDING,
    needsUpdate: false
  };

  // Parse spread value
  const value = prediction.predictionValue.trim();
  let spreadValue: number | null = null;
  let isHomeTeam = true;

  // Handle numeric format
  if (/^[+-]?\d+(\.\d+)?$/.test(value)) {
    spreadValue = parseFloat(value);
    isHomeTeam = spreadValue < 0;
  } 
  // Handle team name format
  else {
    const match = value.match(/^[+-](.+?)\s+([+-]?\d+(\.\d+)?)/);
    if (match) {
      const team = match[1].trim();
      spreadValue = parseFloat(match[2]);
      isHomeTeam = team === game.homeTeamName;
    }
  }

  if (spreadValue === null) {
    console.log(`⚠️ Invalid spread value format: ${value} for prediction ${prediction.id}`);
    return validation;
  }

  // Calculate actual spread
  const actualSpread = game.homeScore - game.awayScore;
  
  // Calculate outcome
  const adjustedSpread = isHomeTeam ? spreadValue : -spreadValue;
  const spreadResult = actualSpread - adjustedSpread;

  if (spreadResult === 0) {
    validation.calculatedOutcome = PredictionOutcome.PUSH;
  } else {
    validation.calculatedOutcome = spreadResult > 0 ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
  }

  validation.needsUpdate = validation.currentOutcome !== validation.calculatedOutcome;
  return validation;
}

validateSpreadPredictions(); 