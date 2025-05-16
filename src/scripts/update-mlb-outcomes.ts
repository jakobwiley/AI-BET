import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function updateMLBOutcomes() {
  try {
    console.log('🔄 Updating MLB prediction outcomes...');

    const thirtyDaysAgo = subDays(new Date(), 30);

    // Get all MLB games from the last 30 days
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: thirtyDaysAgo,
          lt: new Date() // Only get games up to now
        },
        predictions: {
          some: {}
        }
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${games.length} MLB games with predictions to update`);

    let updatedCount = 0;
    let errorCount = 0;
    let missingScoresCount = 0;

    for (const game of games) {
      try {
        // For past games, if no score is set, mark as error
        if (game.homeScore === null || game.awayScore === null) {
          console.error(`Missing score for past game: ${game.awayTeamName} @ ${game.homeTeamName} on ${game.gameDate}`);
          missingScoresCount++;
          continue;
        }

        const homeScore = game.homeScore;
        const awayScore = game.awayScore;
        const homeTeam = game.homeTeamName;
        const awayTeam = game.awayTeamName;

        console.log(`\nProcessing game: ${awayTeam} @ ${homeTeam}`);
        console.log(`Score: ${awayScore}-${homeScore}`);

        // Update each prediction
        for (const prediction of game.predictions) {
          let outcome: PredictionOutcome;

          switch (prediction.predictionType) {
            case PredictionType.MONEYLINE:
              // For moneyline, check if predicted team won
              const predictedTeam = prediction.predictionValue;
              if (predictedTeam === homeTeam) {
                outcome = homeScore > awayScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else if (predictedTeam === awayTeam) {
                outcome = awayScore > homeScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else {
                console.error(`Invalid team name in prediction: ${predictedTeam}`);
                continue;
              }
              break;

            case PredictionType.SPREAD:
              // For spread, check if team covered the spread
              const spread = parseFloat(prediction.predictionValue);
              if (isNaN(spread)) {
                console.error(`Invalid spread value: ${prediction.predictionValue}`);
                continue;
              }

              // If spread is negative, it's for the home team
              if (spread < 0) {
                const homeWithSpread = homeScore + Math.abs(spread);
                outcome = homeWithSpread > awayScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else {
                // If spread is positive, it's for the away team
                const awayWithSpread = awayScore + spread;
                outcome = awayWithSpread > homeScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
              break;

            case PredictionType.TOTAL:
              // For total, check if the combined score went over/under
              const total = parseFloat(prediction.predictionValue);
              if (isNaN(total)) {
                console.error(`Invalid total value: ${prediction.predictionValue}`);
                continue;
              }

              const combinedScore = homeScore + awayScore;
              if (combinedScore > total) {
                outcome = PredictionOutcome.WIN;
              } else if (combinedScore < total) {
                outcome = PredictionOutcome.LOSS;
              } else {
                outcome = PredictionOutcome.PUSH;
              }
              break;

            default:
              console.error(`Unknown prediction type: ${prediction.predictionType}`);
              continue;
          }

          // Update prediction outcome
          await prisma.prediction.update({
            where: { id: prediction.id },
            data: { outcome }
          });

          console.log(`Updated ${prediction.predictionType} prediction: ${outcome}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating game ${game.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Total predictions processed: ${updatedCount}`);
    console.log(`Games with missing scores: ${missingScoresCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error updating outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateMLBOutcomes(); 