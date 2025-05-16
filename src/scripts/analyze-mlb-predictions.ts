import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';
import { subDays } from 'date-fns';
import { format } from 'date-fns';
import { get2025RegularSeasonMLBGames } from './utils/filterRegularSeasonMLBGames.ts';

const prisma = new PrismaClient();

interface PredictionAnalysis {
  total: number;
  correct: number;
  incorrect: number;
  pushes: number;
  pending: number;
  accuracy: number;
  byType: Record<PredictionType, {
    total: number;
    correct: number;
    incorrect: number;
    pushes: number;
    pending: number;
    accuracy: number;
  }>;
  byConfidence: Record<string, {
    total: number;
    correct: number;
    incorrect: number;
    pushes: number;
    pending: number;
    accuracy: number;
  }>;
  recentTrends: {
    last7Days: {
      total: number;
      correct: number;
      accuracy: number;
    };
    last14Days: {
      total: number;
      correct: number;
      accuracy: number;
    };
    last30Days: {
      total: number;
      correct: number;
      accuracy: number;
    };
  };
}

async function analyzeMLBPredictions() {
  try {
    console.log('📊 Analyzing MLB predictions...');

    // Get all 2025 regular season MLB games
    const games = await get2025RegularSeasonMLBGames();

    console.log(`Found ${games.length} 2025 regular season MLB games with predictions`);

    // Initialize analysis object
    const analysis: PredictionAnalysis = {
      total: 0,
      correct: 0,
      incorrect: 0,
      pushes: 0,
      pending: 0,
      accuracy: 0,
      byType: {} as PredictionAnalysis['byType'],
      byConfidence: {},
      recentTrends: {
        last7Days: { total: 0, correct: 0, accuracy: 0 },
        last14Days: { total: 0, correct: 0, accuracy: 0 },
        last30Days: { total: 0, correct: 0, accuracy: 0 }
      }
    };

    // Process each game's predictions
    for (const game of games) {
      if (!game.predictions || game.predictions.length === 0) continue;
      const gameDate = new Date(game.gameDate);
      const isLast7Days = gameDate >= subDays(new Date(), 7);
      const isLast14Days = gameDate >= subDays(new Date(), 14);
      const isLast30Days = gameDate >= subDays(new Date(), 30);

      for (const prediction of game.predictions) {
        // Update totals
        analysis.total++;
        if (isLast30Days) analysis.recentTrends.last30Days.total++;
        if (isLast14Days) analysis.recentTrends.last14Days.total++;
        if (isLast7Days) analysis.recentTrends.last7Days.total++;

        // Initialize type stats if needed
        if (!analysis.byType[prediction.predictionType]) {
          analysis.byType[prediction.predictionType] = {
            total: 0,
            correct: 0,
            incorrect: 0,
            pushes: 0,
            pending: 0,
            accuracy: 0
          };
        }

        // Initialize confidence stats if needed
        const confidenceKey = Math.round(prediction.confidence * 100).toString();
        if (!analysis.byConfidence[confidenceKey]) {
          analysis.byConfidence[confidenceKey] = {
            total: 0,
            correct: 0,
            incorrect: 0,
            pushes: 0,
            pending: 0,
            accuracy: 0
          };
        }

        // Update type and confidence stats
        analysis.byType[prediction.predictionType].total++;
        analysis.byConfidence[confidenceKey].total++;

        // Update outcome counts
        switch (prediction.outcome) {
          case PredictionOutcome.WIN:
            analysis.correct++;
            analysis.byType[prediction.predictionType].correct++;
            analysis.byConfidence[confidenceKey].correct++;
            if (isLast30Days) analysis.recentTrends.last30Days.correct++;
            if (isLast14Days) analysis.recentTrends.last14Days.correct++;
            if (isLast7Days) analysis.recentTrends.last7Days.correct++;
            break;
          case PredictionOutcome.LOSS:
            analysis.incorrect++;
            analysis.byType[prediction.predictionType].incorrect++;
            analysis.byConfidence[confidenceKey].incorrect++;
            break;
          case PredictionOutcome.PUSH:
            analysis.pushes++;
            analysis.byType[prediction.predictionType].pushes++;
            analysis.byConfidence[confidenceKey].pushes++;
            break;
          case PredictionOutcome.PENDING:
            analysis.pending++;
            analysis.byType[prediction.predictionType].pending++;
            analysis.byConfidence[confidenceKey].pending++;
            break;
        }
      }
    }

    // Calculate accuracies
    analysis.accuracy = analysis.correct / (analysis.correct + analysis.incorrect);
    
    for (const type of Object.keys(analysis.byType)) {
      const typeStats = analysis.byType[type as PredictionType];
      typeStats.accuracy = typeStats.correct / (typeStats.correct + typeStats.incorrect);
    }

    for (const confidence of Object.keys(analysis.byConfidence)) {
      const confidenceStats = analysis.byConfidence[confidence];
      confidenceStats.accuracy = confidenceStats.correct / (confidenceStats.correct + confidenceStats.incorrect);
    }

    analysis.recentTrends.last7Days.accuracy = 
      analysis.recentTrends.last7Days.correct / analysis.recentTrends.last7Days.total;
    analysis.recentTrends.last14Days.accuracy = 
      analysis.recentTrends.last14Days.correct / analysis.recentTrends.last14Days.total;
    analysis.recentTrends.last30Days.accuracy = 
      analysis.recentTrends.last30Days.correct / analysis.recentTrends.last30Days.total;

    // Print analysis results
    console.log('\n=== MLB Prediction Analysis ===');
    console.log(`Date Range: ${format(subDays(new Date(), 30), 'MMM d, yyyy')} to ${format(new Date(), 'MMM d, yyyy')}`);
    console.log(`\nOverall Performance:`);
    console.log(`Total Predictions: ${analysis.total}`);
    console.log(`Correct: ${analysis.correct}`);
    console.log(`Incorrect: ${analysis.incorrect}`);
    console.log(`Pushes: ${analysis.pushes}`);
    console.log(`Pending: ${analysis.pending}`);
    console.log(`Accuracy: ${(analysis.accuracy * 100).toFixed(1)}%`);

    console.log('\nPerformance by Prediction Type:');
    for (const [type, stats] of Object.entries(analysis.byType)) {
      console.log(`\n${type}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Correct: ${stats.correct}`);
      console.log(`  Incorrect: ${stats.incorrect}`);
      console.log(`  Pushes: ${stats.pushes}`);
      console.log(`  Pending: ${stats.pending}`);
      console.log(`  Accuracy: ${(stats.accuracy * 100).toFixed(1)}%`);
    }

    console.log('\nPerformance by Confidence Level:');
    for (const [confidence, stats] of Object.entries(analysis.byConfidence)) {
      console.log(`\n${confidence}% Confidence:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Correct: ${stats.correct}`);
      console.log(`  Incorrect: ${stats.incorrect}`);
      console.log(`  Pushes: ${stats.pushes}`);
      console.log(`  Pending: ${stats.pending}`);
      console.log(`  Accuracy: ${(stats.accuracy * 100).toFixed(1)}%`);
    }

    console.log('\nRecent Trends:');
    console.log(`Last 7 Days: ${(analysis.recentTrends.last7Days.accuracy * 100).toFixed(1)}% (${analysis.recentTrends.last7Days.correct}/${analysis.recentTrends.last7Days.total})`);
    console.log(`Last 14 Days: ${(analysis.recentTrends.last14Days.accuracy * 100).toFixed(1)}% (${analysis.recentTrends.last14Days.correct}/${analysis.recentTrends.last14Days.total})`);
    console.log(`Last 30 Days: ${(analysis.recentTrends.last30Days.accuracy * 100).toFixed(1)}% (${analysis.recentTrends.last30Days.correct}/${analysis.recentTrends.last30Days.total})`);

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeMLBPredictions();