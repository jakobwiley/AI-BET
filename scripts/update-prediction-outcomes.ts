import pkg from '@prisma/client';
const { PrismaClient, GameStatus, PredictionOutcome, PredictionType } = pkg;
type PredictionOutcomeType = (typeof PredictionOutcome)[keyof typeof PredictionOutcome];

import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface GameScore {
  home: number;
  away: number;
}

interface GameWithScores {
  id: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamName: string;
  awayTeamName: string;
  predictions: any[];
}

function determineOutcome(prediction: any, score: GameScore): PredictionOutcomeType {
  if (!score) return PredictionOutcome.PENDING;

  switch (prediction.predictionType) {
    case PredictionType.MONEYLINE:
      const predictedWinner = prediction.predictionValue > 0 ? 'away' : 'home';
      const actualWinner = score.home > score.away ? 'home' : 'away';
      return predictedWinner === actualWinner ? PredictionOutcome.WIN : PredictionOutcome.LOSS;

    case PredictionType.SPREAD:
      const homeSpread = prediction.predictionValue;
      const actualSpread = score.home - score.away;
      return (homeSpread > 0 && actualSpread > homeSpread) || 
             (homeSpread < 0 && actualSpread > homeSpread) ? 
             PredictionOutcome.WIN : PredictionOutcome.LOSS;

    case PredictionType.TOTAL:
      const totalScore = score.home + score.away;
      const predictedTotal = prediction.predictionValue;
      const isOver = prediction.predictionValue > 0;
      return (isOver && totalScore > predictedTotal) || 
             (!isOver && totalScore < Math.abs(predictedTotal)) ? 
             PredictionOutcome.WIN : PredictionOutcome.LOSS;

    default:
      return PredictionOutcome.PENDING;
  }
}

async function updatePredictionOutcomes() {
  try {
    console.log('🔄 Updating prediction outcomes...\n');

    // Get all completed games with pending predictions
    const games = await prisma.game.findMany({
      where: {
        status: GameStatus.FINAL,
        predictions: {
          some: {
            outcome: PredictionOutcome.PENDING
          }
        }
      },
      include: {
        predictions: true
      }
    }) as GameWithScores[];

    console.log(`Found ${games.length} completed games with pending predictions`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const game of games) {
      try {
        // Get the final score from the game data
        const score: GameScore = {
          home: game.homeScore ?? 0,
          away: game.awayScore ?? 0
        };

        if (!game.homeScore || !game.awayScore) {
          console.log(`⚠️ No score available for game: ${game.homeTeamName} vs ${game.awayTeamName}`);
          continue;
        }

        console.log(`\nProcessing: ${game.homeTeamName} vs ${game.awayTeamName}`);
        console.log(`Score: ${score.home}-${score.away}`);

        // Update each pending prediction
        for (const prediction of game.predictions) {
          if (prediction.outcome === PredictionOutcome.PENDING) {
            const outcome = determineOutcome(prediction, score);
            
            await prisma.prediction.update({
              where: { id: prediction.id },
              data: { outcome }
            });

            console.log(`  Updated ${prediction.predictionType}: ${outcome}`);
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing game ${game.id}:`, error);
        errorCount++;
      }
    }

    console.log('\nUpdate Summary:');
    console.log(`✅ Successfully updated ${updatedCount} predictions`);
    if (errorCount > 0) {
      console.log(`❌ Encountered errors on ${errorCount} games`);
    }

  } catch (error) {
    console.error('Error updating prediction outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePredictionOutcomes().catch(console.error); 