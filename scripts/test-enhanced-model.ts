import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';
import { EnhancedPredictionModel } from '../lib/enhanced-model';

const prisma = new PrismaClient();

async function testEnhancedModel() {
  try {
    // Get all completed games with their predictions
    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          status: 'FINAL'
        }
      },
      include: {
        game: true
      }
    });

    const model = new EnhancedPredictionModel();
    
    // Group predictions by type for analysis
    const results = {
      [PredictionType.MONEYLINE]: { total: 0, adjustedHighConfidence: 0, originalHighConfidence: 0, adjustedWinRate: 0, originalWinRate: 0 },
      [PredictionType.SPREAD]: { total: 0, adjustedHighConfidence: 0, originalHighConfidence: 0, adjustedWinRate: 0, originalWinRate: 0 },
      [PredictionType.TOTAL]: { total: 0, adjustedHighConfidence: 0, originalHighConfidence: 0, adjustedWinRate: 0, originalWinRate: 0 }
    };

    // Process each prediction
    predictions.forEach(pred => {
      const stats = results[pred.predictionType];
      stats.total++;

      // Calculate new confidence with enhanced model
      const enhancedPrediction = model.getPredictionQuality({
        predictionType: pred.predictionType,
        rawConfidence: pred.confidence,
        predictionValue: String(pred.predictionValue),
        game: pred.game,
        // Note: In production, you would include recent scores and win rates
      });

      // Track high confidence predictions
      if (pred.confidence >= 0.85) {
        stats.originalHighConfidence++;
      }
      if (enhancedPrediction.confidence >= 0.85) {
        stats.adjustedHighConfidence++;
      }

      // Track win rates
      if (pred.outcome === PredictionOutcome.WIN) {
        if (pred.confidence >= 0.85) {
          stats.originalWinRate++;
        }
        if (enhancedPrediction.confidence >= 0.85) {
          stats.adjustedWinRate++;
        }
      }
    });

    // Print analysis
    console.log('\nEnhanced Model Analysis:');
    console.log('----------------------------------------');

    Object.entries(results).forEach(([type, stats]) => {
      console.log(`\n${type}:`);
      console.log('Original Model:');
      console.log(`  High Confidence Predictions: ${stats.originalHighConfidence}`);
      console.log(`  High Confidence Win Rate: ${((stats.originalWinRate / stats.originalHighConfidence) * 100).toFixed(2)}%`);
      
      console.log('\nEnhanced Model:');
      console.log(`  High Confidence Predictions: ${stats.adjustedHighConfidence}`);
      console.log(`  High Confidence Win Rate: ${((stats.adjustedWinRate / stats.adjustedHighConfidence) * 100).toFixed(2)}%`);
      
      const improvement = (
        (stats.adjustedWinRate / stats.adjustedHighConfidence) -
        (stats.originalWinRate / stats.originalHighConfidence)
      ) * 100;
      
      console.log(`\nImprovement in Win Rate: ${improvement.toFixed(2)}%`);
    });

    // Sample some specific predictions
    console.log('\nSample Prediction Adjustments:');
    console.log('----------------------------------------');

    for (let i = 0; i < Math.min(5, predictions.length); i++) {
      const pred = predictions[i];
      const enhanced = model.getPredictionQuality({
        predictionType: pred.predictionType,
        rawConfidence: pred.confidence,
        predictionValue: String(pred.predictionValue),
        game: pred.game
      });

      console.log(`\nPrediction ${i + 1}:`);
      console.log(`Type: ${pred.predictionType}`);
      console.log(`Value: ${pred.predictionValue}`);
      console.log(`Original Confidence: ${(pred.confidence * 100).toFixed(2)}%`);
      console.log(`Adjusted Confidence: ${(enhanced.confidence * 100).toFixed(2)}%`);
      if (enhanced.warning) {
        console.log(`Warning: ${enhanced.warning}`);
      }
      console.log(`Recommendation: ${enhanced.recommendation}`);
      console.log(`Actual Outcome: ${pred.outcome}`);
    }

  } catch (error) {
    console.error('Error testing enhanced model:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEnhancedModel().catch(console.error); 