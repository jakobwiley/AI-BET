import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';
import { EnhancedPredictionModel } from '../src/lib/prediction/enhanced-model';

const prisma = new PrismaClient();
const enhancedModel = new EnhancedPredictionModel();

interface PredictionAnalysis {
  type: PredictionType;
  totalCount: number;
  originalConfidenceAvg: number;
  enhancedConfidenceAvg: number;
  highConfidenceCount: number;
  highConfidenceWins: number;
  warnings: string[];
  rejections: number;
}

async function analyzePredictions() {
  try {
    // Get all predictions with their games
    const predictions = await prisma.prediction.findMany({
      include: {
        game: true
      },
      where: {
        outcome: {
          in: [PredictionOutcome.WIN, PredictionOutcome.LOSS]
        }
      }
    });

    console.log(`Found ${predictions.length} predictions to analyze`);

    // Initialize analysis by type
    const analysis: Record<PredictionType, PredictionAnalysis> = {
      MONEYLINE: {
        type: PredictionType.MONEYLINE,
        totalCount: 0,
        originalConfidenceAvg: 0,
        enhancedConfidenceAvg: 0,
        highConfidenceCount: 0,
        highConfidenceWins: 0,
        warnings: [],
        rejections: 0
      },
      SPREAD: {
        type: PredictionType.SPREAD,
        totalCount: 0,
        originalConfidenceAvg: 0,
        enhancedConfidenceAvg: 0,
        highConfidenceCount: 0,
        highConfidenceWins: 0,
        warnings: [],
        rejections: 0
      },
      TOTAL: {
        type: PredictionType.TOTAL,
        totalCount: 0,
        originalConfidenceAvg: 0,
        enhancedConfidenceAvg: 0,
        highConfidenceCount: 0,
        highConfidenceWins: 0,
        warnings: [],
        rejections: 0
      }
    };

    // Process each prediction
    for (const prediction of predictions) {
      const typeStats = analysis[prediction.predictionType];
      typeStats.totalCount++;

      // Convert prediction to enhanced model input
      const input = {
        predictionType: prediction.predictionType,
        rawConfidence: prediction.confidence,
        predictionValue: String(prediction.predictionValue),
        game: {
          homeTeamName: prediction.game.homeTeamName,
          awayTeamName: prediction.game.awayTeamName,
          homeScore: prediction.game.homeScore,
          awayScore: prediction.game.awayScore,
          status: prediction.game.status
        }
      };

      // Get enhanced model's evaluation
      const quality = enhancedModel.getPredictionQuality(input);

      // Update statistics
      typeStats.originalConfidenceAvg += prediction.confidence;
      typeStats.enhancedConfidenceAvg += quality.confidence;

      if (quality.confidence >= 0.75) {
        typeStats.highConfidenceCount++;
        if (prediction.outcome === PredictionOutcome.WIN) {
          typeStats.highConfidenceWins++;
        }
      }

      if (quality.warning) {
        typeStats.warnings.push(quality.warning);
      }

      if (quality.recommendation === 'REJECT') {
        typeStats.rejections++;
      }
    }

    // Calculate averages and print results
    for (const type of Object.keys(analysis) as PredictionType[]) {
      const stats = analysis[type];
      if (stats.totalCount > 0) {
        stats.originalConfidenceAvg /= stats.totalCount;
        stats.enhancedConfidenceAvg /= stats.totalCount;

        console.log(`\n${type} Analysis:`);
        console.log(`Total Predictions: ${stats.totalCount}`);
        console.log(`Original Confidence Avg: ${(stats.originalConfidenceAvg * 100).toFixed(1)}%`);
        console.log(`Enhanced Confidence Avg: ${(stats.enhancedConfidenceAvg * 100).toFixed(1)}%`);
        console.log(`High Confidence (>75%) Count: ${stats.highConfidenceCount}`);
        if (stats.highConfidenceCount > 0) {
          const winRate = (stats.highConfidenceWins / stats.highConfidenceCount) * 100;
          console.log(`High Confidence Win Rate: ${winRate.toFixed(1)}%`);
        }
        console.log(`Rejections: ${stats.rejections}`);
        console.log(`Common Warnings:`, 
          [...new Set(stats.warnings)]
            .map(warning => `\n  - ${warning}`)
            .join('')
        );
      }
    }

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePredictions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 