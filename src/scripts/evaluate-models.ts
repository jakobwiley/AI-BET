import { PrismaClient, PredictionOutcome } from '@prisma/client';
import { MLModelService } from '../lib/enhanced-mlb/mlModelService.js';
import type { Prediction } from '../models/types.ts';

const prisma = new PrismaClient();

function mapPrismaPredictionToPrediction(prismaPrediction: any): Prediction {
  return {
    id: prismaPrediction.id,
    gameId: prismaPrediction.gameId,
    predictionType: prismaPrediction.predictionType,
    predictionValue: prismaPrediction.predictionValue,
    confidence: prismaPrediction.confidence,
    grade: prismaPrediction.grade || 'C', // Default to 'C' if not set
    reasoning: prismaPrediction.reasoning,
    outcome: prismaPrediction.outcome,
    createdAt: prismaPrediction.createdAt.toISOString(),
    updatedAt: prismaPrediction.updatedAt.toISOString()
  };
}

async function evaluateModels() {
  try {
    console.log('Starting model evaluation...');

    // Get all predictions with outcomes
    const predictions = await prisma.prediction.findMany({
      where: {
        outcome: {
          not: PredictionOutcome.PENDING
        }
      },
      include: {
        game: true
      }
    });

    console.log(`Found ${predictions.length} predictions to evaluate`);

    // Track results for each prediction
    for (const prismaPrediction of predictions) {
      const prediction = mapPrismaPredictionToPrediction(prismaPrediction);
      await MLModelService.trackPredictionResult(prediction, prediction.outcome!);
    }

    // Adjust model weights based on performance
    await MLModelService.adjustModelWeights();

    // Get updated model performances
    const models = ['enhanced', 'basic', 'historical', 'situational'];
    const performances = await Promise.all(
      models.map(model => MLModelService.getModelPerformance(model))
    );

    // Log performance metrics
    console.log('\nModel Performance Summary:');
    performances.forEach(perf => {
      console.log(`\n${perf.modelId}:`);
      console.log(`Total Predictions: ${perf.totalPredictions}`);
      console.log(`Correct Predictions: ${perf.correctPredictions}`);
      console.log(`Accuracy: ${(perf.accuracy * 100).toFixed(2)}%`);
      
      console.log('\nConfidence Calibration:');
      Object.entries(perf.confidenceCalibration).forEach(([range, cal]) => {
        console.log(`${range}: ${(cal.accuracy * 100).toFixed(2)}% (${cal.correct}/${cal.total})`);
      });
    });

    console.log('\nModel evaluation completed successfully');
  } catch (error) {
    console.error('Error evaluating models:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the evaluation
evaluateModels().catch(console.error); 