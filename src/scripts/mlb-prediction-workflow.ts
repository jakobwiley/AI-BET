import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';
import { EnhancedAnalyzer } from '../lib/enhanced-predictions/enhancedAnalyzer.js';
import { getConfidenceGrade } from '../lib/prediction.js';
import { subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { Game } from '../models/types.ts';

const prisma = new PrismaClient();

async function runMLBPredictionWorkflow() {
  try {
    console.log('🚀 Starting MLB Prediction Workflow...');

    // Step 1: Generate predictions for upcoming games
    console.log('\n📊 Step 1: Generating predictions for upcoming games...');
    const upcomingGames = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        status: GameStatus.SCHEDULED,
        predictions: {
          none: {}
        }
      }
    });

    console.log(`Found ${upcomingGames.length} upcoming games without predictions`);

    for (const game of upcomingGames) {
      try {
        console.log(`\nGenerating predictions for: ${game.awayTeamName} @ ${game.homeTeamName}`);
        const gameForPrediction = {
          ...game,
          gameDate: game.gameDate.toISOString(),
          startTime: game.startTime || game.gameDate.toISOString()
        };
        const predictions = await EnhancedAnalyzer.generatePredictions(gameForPrediction);
        
        for (const prediction of predictions) {
          await prisma.prediction.create({
            data: {
              id: uuidv4(),
              gameId: game.id,
              predictionType: prediction.predictionType,
              predictionValue: prediction.predictionValue,
              confidence: prediction.confidence,
              reasoning: prediction.reasoning,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      } catch (error) {
        console.error(`Error generating predictions for game ${game.id}:`, error);
      }
    }

    // Step 2: Evaluate completed games
    console.log('\n📈 Step 2: Evaluating completed games...');
    const threeDaysAgo = subDays(new Date(), 3);
    const completedGames = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
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

    console.log(`Found ${completedGames.length} completed games to evaluate`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const game of completedGames) {
      if (!game.homeScore || !game.awayScore) continue;
      
      console.log(`\nEvaluating: ${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Final Score: ${game.awayScore} - ${game.homeScore}`);

      for (const prediction of game.predictions) {
        try {
          let outcome: PredictionOutcome = PredictionOutcome.PENDING;
          const predictionValue = parseFloat(prediction.predictionValue);

          switch (prediction.predictionType) {
            case PredictionType.SPREAD:
              const actualSpread = game.homeScore - game.awayScore;
              outcome = actualSpread > predictionValue ? 
                PredictionOutcome.WIN : PredictionOutcome.LOSS;
              break;

            case PredictionType.MONEYLINE:
              const homeWon = game.homeScore > game.awayScore;
              outcome = (predictionValue > 0 && homeWon) || 
                       (predictionValue < 0 && !homeWon) ?
                PredictionOutcome.WIN : PredictionOutcome.LOSS;
              break;

            case PredictionType.TOTAL:
              const totalScore = game.homeScore + game.awayScore;
              outcome = (predictionValue > 0 && totalScore > Math.abs(predictionValue)) ||
                       (predictionValue < 0 && totalScore < Math.abs(predictionValue)) ?
                PredictionOutcome.WIN : PredictionOutcome.LOSS;
              break;
          }

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

    // Step 3: Generate performance report
    console.log('\n📊 Step 3: Generating performance report...');
    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          sport: SportType.MLB,
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

    // Performance by type and confidence grade
    const byTypeAndGrade = predictions.reduce((acc, pred) => {
      const grade = getConfidenceGrade(pred.confidence);
      if (!acc[pred.predictionType]) {
        acc[pred.predictionType] = {};
      }
      if (!acc[pred.predictionType][grade]) {
        acc[pred.predictionType][grade] = { wins: 0, losses: 0, total: 0 };
      }
      acc[pred.predictionType][grade].total++;
      if (pred.outcome === PredictionOutcome.WIN) acc[pred.predictionType][grade].wins++;
      if (pred.outcome === PredictionOutcome.LOSS) acc[pred.predictionType][grade].losses++;
      return acc;
    }, {} as Record<string, Record<string, { wins: number; losses: number; total: number }>>);

    console.log('\nPerformance by Type and Grade:');
    Object.entries(byTypeAndGrade).forEach(([type, grades]) => {
      console.log(`\n${type}:`);
      Object.entries(grades).forEach(([grade, stats]) => {
        if (stats.wins + stats.losses > 0) {
          const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(2);
          console.log(`  ${grade}:`);
          console.log(`    Total: ${stats.total}`);
          console.log(`    Win Rate: ${winRate}%`);
        }
      });
    });

  } catch (error) {
    console.error('Error in MLB Prediction Workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the workflow
runMLBPredictionWorkflow(); 