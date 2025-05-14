import pkg from '@prisma/client';
const { PrismaClient, PredictionOutcome } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function checkPredictionOutcomes() {
  try {
    console.log('🔍 Checking prediction outcomes in database...');
    
    // Get all predictions with their outcomes
    const predictions = await prisma.prediction.findMany({
      select: {
        id: true,
        predictionType: true,
        predictionValue: true,
        confidence: true,
        outcome: true,
        game: {
          select: {
            id: true,
            homeTeamName: true,
            awayTeamName: true,
            status: true
          }
        }
      }
    });
    
    console.log(`Found ${predictions.length} predictions`);
    
    // Count outcomes
    const outcomeCounts = {
      WIN: 0,
      LOSS: 0,
      PENDING: 0
    };
    
    // Count by prediction type
    const typeCounts = {
      MONEYLINE: { total: 0, WIN: 0, LOSS: 0, PENDING: 0 },
      SPREAD: { total: 0, WIN: 0, LOSS: 0, PENDING: 0 },
      TOTAL: { total: 0, WIN: 0, LOSS: 0, PENDING: 0 }
    };
    
    // Count by confidence grade
    const gradeCounts: { [grade: string]: { total: number, WIN: number, LOSS: number, PENDING: number } } = {};
    
    for (const prediction of predictions) {
      // Count overall outcomes
      outcomeCounts[prediction.outcome]++;
      
      // Count by type
      typeCounts[prediction.predictionType].total++;
      typeCounts[prediction.predictionType][prediction.outcome]++;
      
      // Calculate grade
      const grade = calculateGrade(prediction.confidence);
      if (!gradeCounts[grade]) {
        gradeCounts[grade] = { total: 0, WIN: 0, LOSS: 0, PENDING: 0 };
      }
      gradeCounts[grade].total++;
      gradeCounts[grade][prediction.outcome]++;
    }
    
    // Print results
    console.log('\n📊 Overall Outcome Distribution:');
    console.log('-----------------------------------');
    for (const [outcome, count] of Object.entries(outcomeCounts)) {
      console.log(`${outcome}: ${count} (${((count / predictions.length) * 100).toFixed(2)}%)`);
    }
    
    console.log('\n📊 Outcomes by Prediction Type:');
    console.log('-----------------------------------');
    for (const [type, counts] of Object.entries(typeCounts)) {
      console.log(`\n${type}:`);
      console.log(`  Total: ${counts.total}`);
      for (const [outcome, count] of Object.entries(counts)) {
        if (outcome !== 'total') {
          console.log(`  ${outcome}: ${count} (${((count / counts.total) * 100).toFixed(2)}%)`);
        }
      }
    }
    
    console.log('\n📊 Outcomes by Grade:');
    console.log('-----------------------------------');
    for (const [grade, counts] of Object.entries(gradeCounts)) {
      console.log(`\nGrade ${grade}:`);
      console.log(`  Total: ${counts.total}`);
      for (const [outcome, count] of Object.entries(counts)) {
        if (outcome !== 'total') {
          console.log(`  ${outcome}: ${count} (${((count / counts.total) * 100).toFixed(2)}%)`);
        }
      }
    }
    
    // Print some example predictions
    console.log('\n🔍 Example Predictions:');
    console.log('-----------------------------------');
    const examples = predictions.slice(0, 5);
    for (const pred of examples) {
      console.log(`\nPrediction ID: ${pred.id}`);
      console.log(`Game: ${pred.game.homeTeamName} vs ${pred.game.awayTeamName}`);
      console.log(`Type: ${pred.predictionType}`);
      console.log(`Value: ${pred.predictionValue}`);
      console.log(`Confidence: ${pred.confidence}%`);
      console.log(`Outcome: ${pred.outcome}`);
      console.log(`Game Status: ${pred.game.status}`);
    }
    
  } catch (error) {
    console.error('Error checking prediction outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to calculate grade based on confidence
function calculateGrade(confidence: number): string {
  if (confidence >= 85) return 'A+';
  if (confidence >= 80) return 'A';
  if (confidence >= 75) return 'A-';
  if (confidence >= 70) return 'B+';
  if (confidence >= 65) return 'B';
  if (confidence >= 60) return 'B-';
  if (confidence >= 55) return 'C+';
  if (confidence >= 50) return 'C';
  return 'C-';
}

// Run the check
checkPredictionOutcomes(); 