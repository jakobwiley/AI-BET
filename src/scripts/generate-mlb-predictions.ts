import pkg from '@prisma/client';
import type { Game as PrismaGame, Prediction as PrismaPrediction } from '@prisma/client';
const { PrismaClient, PredictionType, SportType, GameStatus, PredictionOutcome } = pkg;
import { EnhancedPredictionService } from '../lib/enhanced-mlb/enhancedPredictionService.ts';
import { MLBStatsService } from '../lib/mlbStatsApi.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const enhancedPredictionService = new EnhancedPredictionService();

async function generatePredictions(games: PrismaGame[]): Promise<void> {
  for (const game of games) {
    try {
      // Parse odds from JSON
      const odds = game.oddsJson as any;
      if (!odds?.total?.overUnder) {
        console.log(`Skipping game ${game.id} - no total odds available`);
        continue;
      }

      // Prepare pitcher IDs
      let probableHomePitcherId = game.probableHomePitcherId;
      let probableAwayPitcherId = game.probableAwayPitcherId;
      // If game is FINAL and ID is numeric, fetch actual starting pitchers
      if (game.status === 'FINAL' && !isNaN(Number(game.id))) {
        const boxscore = await MLBStatsService.getActualStartingPitchers(Number(game.id));
        if (boxscore) {
          probableHomePitcherId = boxscore.homePitcherId;
          probableAwayPitcherId = boxscore.awayPitcherId;
          console.log(`Fetched actual pitchers for game ${game.id}: home=${probableHomePitcherId}, away=${probableAwayPitcherId}`);
        }
      }

      // Convert Prisma Game to our Game type
      const gameForPrediction = {
        ...game,
        gameDate: game.gameDate.toISOString(),
        odds: {
          total: {
            overUnder: odds.total.overUnder.toString(),
            overOdds: odds.total.overOdds.toString(),
            underOdds: odds.total.underOdds.toString()
          }
        },
        probableHomePitcherId,
        probableAwayPitcherId
      };

      // Generate prediction using enhanced service
      const prediction = await enhancedPredictionService.generatePrediction(gameForPrediction);

      // Save prediction to database
      await prisma.prediction.create({
        data: prediction
      });

      console.log(`Generated prediction for game ${game.id}: ${prediction.predictionValue} ${odds.total.overUnder}`);
      console.log('Reasoning:', prediction.reasoning);
    } catch (error) {
      console.error(`Error generating prediction for game ${game.id}:`, error);
    }
  }
}

async function analyzePredictions(): Promise<void> {
  try {
    // Get predictions from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          sport: SportType.MLB,
          gameDate: {
            gte: thirtyDaysAgo
          },
          probableHomePitcherId: { not: null },
          probableAwayPitcherId: { not: null }
        },
        predictionType: PredictionType.TOTAL,
        outcome: {
          not: PredictionOutcome.PENDING
        }
      },
      include: {
        game: true
      }
    });

    // Only include predictions for games with numeric IDs
    const filteredPredictions = predictions.filter(p => /^\d+$/.test(p.game.id));

    // Analyze results
    const totalPredictions = filteredPredictions.length;
    const wins = filteredPredictions.filter(p => p.outcome === PredictionOutcome.WIN).length;
    const losses = filteredPredictions.filter(p => p.outcome === PredictionOutcome.LOSS).length;
    const pushes = filteredPredictions.filter(p => p.outcome === PredictionOutcome.PUSH).length;
    const winRate = totalPredictions > 0 ? (wins / totalPredictions) * 100 : 0;

    // Group by confidence levels
    const confidenceGroups = filteredPredictions.reduce((acc, pred) => {
      const group = Math.floor(pred.confidence * 10) / 10; // Round to nearest 0.1
      if (!acc[group]) {
        acc[group] = { total: 0, wins: 0 };
      }
      acc[group].total++;
      if (pred.outcome === PredictionOutcome.WIN) {
        acc[group].wins++;
      }
      return acc;
    }, {} as Record<number, { total: number; wins: number }>);

    console.log('\n=== Prediction Analysis (Last 30 Days) ===');
    console.log(`Total Predictions: ${totalPredictions}`);
    console.log(`Wins: ${wins}`);
    console.log(`Losses: ${losses}`);
    console.log(`Pushes: ${pushes}`);
    console.log(`Win Rate: ${winRate.toFixed(1)}%`);
    console.log('\nPerformance by Confidence Level:');
    Object.entries(confidenceGroups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([confidence, stats]) => {
        const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
        console.log(`${confidence} confidence: ${stats.wins}/${stats.total} (${winRate.toFixed(1)}%)`);
      });

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  }
}

async function main() {
  try {
    // Get games from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: thirtyDaysAgo
        },
        status: GameStatus.FINAL,
        predictions: {
          none: {
            predictionType: PredictionType.TOTAL
          }
        }
      }
    });

    if (games.length === 0) {
      console.log('No games found for the last 30 days that need predictions');
      return;
    }

    console.log(`Found ${games.length} games from the last 30 days that need predictions`);
    await generatePredictions(games);
    
    // Analyze the predictions
    await analyzePredictions();
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 