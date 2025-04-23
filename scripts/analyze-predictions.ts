import { PrismaClient, PredictionType } from '@prisma/client';
import { PredictionService } from '../src/lib/predictionService';

const prisma = new PrismaClient();

async function analyzePredictions() {
  try {
    // Get predictions from April 13-14, 2024
    const predictions = await prisma.prediction.findMany({
      where: {
        createdAt: {
          gte: new Date('2024-04-13'),
          lte: new Date('2024-04-14')
        }
      },
      include: {
        game: true
      }
    });

    console.log(`Found ${predictions.length} predictions to analyze`);

    // Analyze each prediction
    for (const prediction of predictions) {
      const game = prediction.game;
      const confidence = prediction.confidence;
      const grade = PredictionService['calculateGrade'](confidence);
      
      console.log(`\nGame: ${game.homeTeamName} vs ${game.awayTeamName}`);
      console.log(`Prediction Type: ${prediction.predictionType}`);
      console.log(`Confidence: ${confidence}`);
      console.log(`Grade: ${grade}`);
      console.log(`Reasoning: ${prediction.reasoning}`);
    }

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePredictions(); 