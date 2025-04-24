import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';
import type { Prediction, Game } from '@prisma/client';

const prisma = new PrismaClient();

async function calculateMoneylineOutcome(prediction: Prediction, game: Game): Promise<PredictionOutcome> {
  // Extract just the numeric part for old format, or team name for new format
  const predictionValue = String(prediction.predictionValue).trim();
  const oldFormatMatch = predictionValue.match(/^[+-]?\d+$/);
  const newFormatMatch = predictionValue.match(/^[+-](.+)$/);
  
  if (!oldFormatMatch && !newFormatMatch) {
    console.error(`Invalid moneyline value for prediction ${prediction.id}: ${prediction.predictionValue}`);
    return PredictionOutcome.PENDING;
  }

  if (!game.homeScore || !game.awayScore) {
    return PredictionOutcome.PENDING;
  }

  if (game.homeScore === game.awayScore) {
    return PredictionOutcome.PUSH;
  }

  const homeTeamWon = game.homeScore > game.awayScore;
  
  // For old format, + means home team, - means away team
  // For new format, check if the predicted team matches the winner
  if (oldFormatMatch) {
    const predictedHomeTeam = predictionValue.startsWith('+');
    return (homeTeamWon === predictedHomeTeam) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
  } else {
    const predictedTeam = newFormatMatch![1].trim();
    const predictedHomeTeam = predictedTeam === game.homeTeamName;
    return (homeTeamWon === predictedHomeTeam) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
  }
}

async function calculateSpreadOutcome(prediction: Prediction, game: Game): Promise<PredictionOutcome> {
  const predictionValue = String(prediction.predictionValue).trim();
  
  // Handle old format (+/-X.X)
  const oldFormatMatch = predictionValue.match(/^([+-]?\d+\.?\d*)$/);
  // Handle new format (+Team Name X.X)
  const newFormatMatch = predictionValue.match(/^[+-](.+?)\s+([+-]?\d+\.?\d*)$/);
  // Handle confidence format
  const confidenceFormatMatch = predictionValue.match(/^\+\(Grade:/);
  
  if (confidenceFormatMatch) {
    console.error(`Skipping confidence format spread for prediction ${prediction.id}: ${prediction.predictionValue}`);
    return PredictionOutcome.PENDING;
  }
  
  if (!oldFormatMatch && !newFormatMatch) {
    console.error(`Invalid spread value for prediction ${prediction.id}: ${prediction.predictionValue}`);
    return PredictionOutcome.PENDING;
  }

  if (!game.homeScore || !game.awayScore) {
    return PredictionOutcome.PENDING;
  }

  const actualSpread = game.homeScore - game.awayScore;
  let predictedSpread: number;
  
  if (oldFormatMatch) {
    predictedSpread = parseFloat(oldFormatMatch[1]);
  } else {
    const spreadValue = parseFloat(newFormatMatch![2]);
    const teamName = newFormatMatch![1].trim();
    // If predicted team is away team, flip the spread
    predictedSpread = teamName === game.awayTeamName ? -spreadValue : spreadValue;
  }
  
  if (actualSpread === predictedSpread) {
    return PredictionOutcome.PUSH;
  }

  return (actualSpread > predictedSpread) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
}

async function calculateTotalOutcome(prediction: Prediction, game: Game): Promise<PredictionOutcome> {
  try {
    const predictionValue = String(prediction.predictionValue).trim();
    
    // Handle old format (just number)
    const oldFormatMatch = predictionValue.match(/^(\d+\.?\d*)$/);
    // Handle new format (Over/Under X.X)
    const newFormatMatch = predictionValue.match(/^(Over|Under)\s+(\d+\.?\d*)$/i);
    
    if (!oldFormatMatch && !newFormatMatch) {
      console.error(`Invalid total value for prediction ${prediction.id}: ${prediction.predictionValue}`);
      return PredictionOutcome.PENDING;
    }

    if (!game.homeScore || !game.awayScore) {
      return PredictionOutcome.PENDING;
    }

    const actualTotal = game.homeScore + game.awayScore;
    let total: number;
    let isOver: boolean;
    
    if (oldFormatMatch) {
      // For old format, assume Over (this might need to be adjusted based on your data)
      total = parseFloat(oldFormatMatch[1]);
      isOver = true;
    } else {
      total = parseFloat(newFormatMatch![2]);
      isOver = newFormatMatch![1].toLowerCase() === 'over';
    }
    
    if (actualTotal === total) {
      return PredictionOutcome.PUSH;
    }
    
    return (isOver ? actualTotal > total : actualTotal < total) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
  } catch (error) {
    console.error(`Error processing total prediction ${prediction.id}: ${error}`);
    return PredictionOutcome.PENDING;
  }
}

async function recalculateOutcomes() {
  const predictions = await prisma.prediction.findMany({
    include: {
      game: true
    }
  });

  console.log(`Found ${predictions.length} predictions to recalculate`);
  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  const outcomeChanges = {
    toWin: 0,
    toLoss: 0,
    toPush: 0,
    toPending: 0
  };

  for (const prediction of predictions) {
    if (!prediction.game) {
      console.error(`No game found for prediction ${prediction.id}`);
      errors++;
      continue;
    }

    let newOutcome: PredictionOutcome;

    switch (prediction.predictionType) {
      case PredictionType.MONEYLINE:
        newOutcome = await calculateMoneylineOutcome(prediction, prediction.game);
        break;
      case PredictionType.SPREAD:
        newOutcome = await calculateSpreadOutcome(prediction, prediction.game);
        break;
      case PredictionType.TOTAL:
        newOutcome = await calculateTotalOutcome(prediction, prediction.game);
        break;
      default:
        console.error(`Unknown prediction type for prediction ${prediction.id}: ${prediction.predictionType}`);
        errors++;
        continue;
    }

    if (newOutcome !== prediction.outcome) {
      try {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { outcome: newOutcome }
        });
        
        // Track outcome changes
        switch (newOutcome) {
          case PredictionOutcome.WIN:
            outcomeChanges.toWin++;
            break;
          case PredictionOutcome.LOSS:
            outcomeChanges.toLoss++;
            break;
          case PredictionOutcome.PUSH:
            outcomeChanges.toPush++;
            break;
          case PredictionOutcome.PENDING:
            outcomeChanges.toPending++;
            break;
        }
        
        console.log(`Updated prediction ${prediction.id} from ${prediction.outcome} to ${newOutcome}`);
        updated++;
      } catch (error) {
        console.error(`Error updating prediction ${prediction.id}: ${error}`);
        errors++;
      }
    } else {
      unchanged++;
    }
  }

  console.log(`
Processed ${predictions.length} predictions:
- Updated: ${updated}
- Unchanged: ${unchanged}
- Errors: ${errors}

Outcome Changes:
- To WIN: ${outcomeChanges.toWin}
- To LOSS: ${outcomeChanges.toLoss}
- To PUSH: ${outcomeChanges.toPush}
- To PENDING: ${outcomeChanges.toPending}
`);
}

recalculateOutcomes()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 