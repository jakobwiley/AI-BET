import { PrismaClient, PredictionType, PredictionOutcome, GameStatus } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

interface GameWithPredictions {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  predictions: Array<{
    id: string;
    predictionType: PredictionType;
    predictionValue: number;
    outcome: PredictionOutcome;
  }>;
}

async function evaluatePredictions() {
  try {
    console.log('🔄 Starting MLB prediction evaluation...');
    
    // Get all MLB games from the last 3 days that are FINAL and have scores
    const threeDaysAgo = subDays(new Date(), 3);
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: threeDaysAgo
        },
        status: GameStatus.FINAL,
        NOT: {
          homeScore: null,
          awayScore: null
        }
      },
      include: {
        predictions: true
      }
    });
    
    console.log(`Found ${games.length} completed MLB games to evaluate`);
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const game of games) {
      if (!game.homeScore || !game.awayScore) continue;
      
      console.log(`\nEvaluating: ${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Final Score: ${game.awayScore} - ${game.homeScore}`);

      for (const prediction of game.predictions) {
        try {
          let outcome: PredictionOutcome = PredictionOutcome.PENDING;

          switch (prediction.predictionType) {
            case PredictionType.SPREAD:
              // For MLB, spread is usually called "run line" and is typically -1.5 for favorite
              const actualSpread = game.homeScore - game.awayScore;
              outcome = actualSpread > prediction.predictionValue ? 
                PredictionOutcome.WIN : PredictionOutcome.LOSS;
              break;

            case PredictionType.MONEYLINE:
              // Moneyline prediction is simple win/loss
              // predictionValue > 0 means predicting home team win
              const homeWon = game.homeScore > game.awayScore;
              outcome = (prediction.predictionValue > 0 && homeWon) || 
                       (prediction.predictionValue < 0 && !homeWon) ?
                PredictionOutcome.WIN : PredictionOutcome.LOSS;
              break;

            case PredictionType.TOTAL:
              const totalScore = game.homeScore + game.awayScore;
              // predictionValue > 0 means OVER, < 0 means UNDER
              outcome = (prediction.predictionValue > 0 && totalScore > Math.abs(prediction.predictionValue)) ||
                       (prediction.predictionValue < 0 && totalScore < Math.abs(prediction.predictionValue)) ?
                PredictionOutcome.WIN : PredictionOutcome.LOSS;
              break;
          }

          // Update prediction outcome
          await prisma.prediction.update({
            where: { id: prediction.id },
            data: { outcome }
          });

          console.log(`${prediction.predictionType}: ${outcome}`);
          updatedCount++;
        } catch (error) {
          console.error(`Error evaluating prediction ${prediction.id}:`, error);
          errorCount++;
        }
      }
    }

    // Print summary
    console.log('\n=== Evaluation Summary ===');
    console.log(`Total predictions evaluated: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

    // Show prediction performance
    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          sport: 'MLB',
          gameDate: {
            gte: threeDaysAgo
          },
          status: GameStatus.FINAL
        }
      }
    });

    const totalPredictions = predictions.length;
    const wins = predictions.filter(p => p.outcome === PredictionOutcome.WIN).length;
    const losses = predictions.filter(p => p.outcome === PredictionOutcome.LOSS).length;
    const pending = predictions.filter(p => p.outcome === PredictionOutcome.PENDING).length;

    console.log('\n=== Performance Summary ===');
    console.log(`Total Predictions: ${totalPredictions}`);
    console.log(`Wins: ${wins}`);
    console.log(`Losses: ${losses}`);
    console.log(`Pending: ${pending}`);
    if (wins + losses > 0) {
      console.log(`Win Rate: ${((wins / (wins + losses)) * 100).toFixed(2)}%`);
    }

    // Performance by type
    const byType = predictions.reduce((acc, pred) => {
      if (!acc[pred.predictionType]) {
        acc[pred.predictionType] = { wins: 0, losses: 0, total: 0 };
      }
      acc[pred.predictionType].total++;
      if (pred.outcome === PredictionOutcome.WIN) acc[pred.predictionType].wins++;
      if (pred.outcome === PredictionOutcome.LOSS) acc[pred.predictionType].losses++;
      return acc;
    }, {} as Record<string, { wins: number; losses: number; total: number }>);

    console.log('\nPerformance by Type:');
    Object.entries(byType).forEach(([type, stats]) => {
      if (stats.wins + stats.losses > 0) {
        const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(2);
        console.log(`${type}:`);
        console.log(`  Total: ${stats.total}`);
        console.log(`  Win Rate: ${winRate}%`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the evaluation
evaluatePredictions(); 