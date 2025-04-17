import { PrismaClient, PredictionOutcome, GameStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function getConfidenceGrade(confidence: number): string | null {
  if (confidence >= 0.90) return 'A+';
  if (confidence >= 0.85) return 'A';
  if (confidence >= 0.80) return 'A-';
  if (confidence >= 0.75) return 'B+';
  return null;
}

async function analyzePastPredictions() {
  try {
    console.log('🔍 Analyzing past predictions with high confidence grades...\n');

    // Get all completed games with predictions
    const predictions = await prisma.prediction.findMany({
      where: {
        confidence: {
          gte: 0.75 // B+ or better
        },
        game: {
          AND: [
            { homeScore: { not: null } },
            { awayScore: { not: null } },
            { status: GameStatus.FINAL }
          ]
        }
      },
      include: {
        game: true
      }
    });

    console.log(`Found ${predictions.length} completed predictions with scores\n`);

    // Group predictions by grade
    const resultsByGrade: Record<string, { wins: number; losses: number }> = {
      'A+': { wins: 0, losses: 0 },
      'A': { wins: 0, losses: 0 },
      'A-': { wins: 0, losses: 0 },
      'B+': { wins: 0, losses: 0 }
    };

    predictions.forEach(prediction => {
      const grade = getConfidenceGrade(prediction.confidence);
      if (grade && prediction.outcome !== PredictionOutcome.PENDING) {
        if (prediction.outcome === PredictionOutcome.WIN) {
          resultsByGrade[grade].wins++;
        } else {
          resultsByGrade[grade].losses++;
        }
      }
    });

    // Print results
    console.log('Results by Confidence Grade:');
    console.log('============================\n');

    Object.entries(resultsByGrade).forEach(([grade, results]) => {
      const total = results.wins + results.losses;
      const winRate = total > 0 ? (results.wins / total * 100).toFixed(1) : '0.0';
      
      console.log(`Grade ${grade}:`);
      console.log(`Total Predictions: ${total}`);
      console.log(`Wins: ${results.wins}`);
      console.log(`Losses: ${results.losses}`);
      console.log(`Win Rate: ${winRate}%\n`);
    });

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePastPredictions().catch(console.error); 