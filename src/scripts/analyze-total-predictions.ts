import { PrismaClient, PredictionType, GameStatus } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

function parseTotalPrediction(value: string): { line: number; direction: 'OVER' | 'UNDER' } | null {
  // Match patterns like "o8.5", "u8.5", "OVER 8.5", "UNDER 8.5"
  const match = value.match(/^(o|u|OVER|UNDER)\s*(\d+(\.\d+)?)$/i);
  if (!match) return null;
  
  const direction = match[1].toUpperCase().startsWith('O') ? 'OVER' : 'UNDER';
  const line = parseFloat(match[2]);
  
  return { line, direction };
}

async function analyzeTotalPredictions() {
  console.log('📊 Analyzing TOTAL predictions in detail...\n');

  // Get all TOTAL predictions from the last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const predictions = await prisma.prediction.findMany({
    where: {
      predictionType: PredictionType.TOTAL,
      game: {
        gameDate: {
          gte: thirtyDaysAgo
        },
        status: GameStatus.FINAL
      }
    },
    include: {
      game: true
    },
    orderBy: {
      game: {
        gameDate: 'desc'
      }
    }
  });

  console.log(`Found ${predictions.length} TOTAL predictions to analyze\n`);

  let correct = 0;
  let incorrect = 0;
  let pushes = 0;
  let totalScoreDiff = 0;
  let overPredictions = 0;
  let underPredictions = 0;
  let highScoringGames = 0;
  let lowScoringGames = 0;
  const incorrectPredictions: any[] = [];

  for (const pred of predictions) {
    if (typeof pred.game.homeScore !== 'number' || typeof pred.game.awayScore !== 'number') continue;

    const actualTotal = pred.game.homeScore + pred.game.awayScore;
    const parsedPrediction = parseTotalPrediction(pred.predictionValue);
    if (!parsedPrediction) continue;

    const { line, direction } = parsedPrediction;

    // Determine if the actual result was over, under, or push
    let actualResult: 'OVER' | 'UNDER' | 'PUSH';
    if (actualTotal > line) actualResult = 'OVER';
    else if (actualTotal < line) actualResult = 'UNDER';
    else actualResult = 'PUSH';

    // Track if the model was correct
    if (actualResult === 'PUSH') {
      pushes++;
    } else if (direction === actualResult) {
      correct++;
    } else {
      incorrect++;
      incorrectPredictions.push({
        gameId: pred.gameId,
        date: pred.game.gameDate,
        teams: `${pred.game.awayTeamName} @ ${pred.game.homeTeamName}`,
        line,
        direction,
        actualTotal,
        actualResult,
        confidence: pred.confidence,
        homeScore: pred.game.homeScore,
        awayScore: pred.game.awayScore
      });
    }

    // For stats
    const scoreDiff = Math.abs(actualTotal - line);
    totalScoreDiff += scoreDiff;
    if (actualTotal > line) overPredictions++;
    else if (actualTotal < line) underPredictions++;
    if (actualTotal >= 10) highScoringGames++;
    else lowScoringGames++;
  }

  const totalPredictions = correct + incorrect + pushes;
  const accuracy = (correct / (correct + incorrect)) * 100;
  const avgScoreDiff = totalScoreDiff / totalPredictions;
  const overPredictionRate = (overPredictions / totalPredictions) * 100;
  const underPredictionRate = (underPredictions / totalPredictions) * 100;
  const highScoringRate = (highScoringGames / totalPredictions) * 100;

  // Print overall statistics
  console.log('=== TOTAL Predictions Analysis ===\n');
  console.log(`Overall Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`Pushes: ${pushes}`);
  console.log(`Average Score Difference (from line): ${avgScoreDiff.toFixed(2)} points`);
  console.log(`Over Prediction Rate: ${overPredictionRate.toFixed(1)}%`);
  console.log(`Under Prediction Rate: ${underPredictionRate.toFixed(1)}%`);
  console.log(`High Scoring Games Rate: ${highScoringRate.toFixed(1)}%`);

  // Analyze incorrect predictions
  console.log('\n=== Incorrect Predictions Analysis ===\n');
  console.log(`Total Incorrect: ${incorrect}`);

  // Group incorrect predictions by score difference ranges
  const diffRanges = {
    '0-2': 0,
    '3-5': 0,
    '6-10': 0,
    '11+': 0
  };

  incorrectPredictions.forEach(pred => {
    const diff = Math.abs(pred.actualTotal - pred.line);
    if (diff <= 2) diffRanges['0-2']++;
    else if (diff <= 5) diffRanges['3-5']++;
    else if (diff <= 10) diffRanges['6-10']++;
    else diffRanges['11+']++;
  });

  console.log('\nScore Difference Distribution:');
  Object.entries(diffRanges).forEach(([range, count]) => {
    console.log(`${range} points: ${count} predictions (${((count/incorrect)*100).toFixed(1)}%)`);
  });

  // Analyze by confidence level
  console.log('\n=== Performance by Confidence Level ===\n');
  const confidenceRanges = {
    '0.55-0.60': { correct: 0, total: 0 },
    '0.61-0.65': { correct: 0, total: 0 },
    '0.66-0.70': { correct: 0, total: 0 },
    '0.71-0.75': { correct: 0, total: 0 },
    '0.76-0.80': { correct: 0, total: 0 },
    '0.81+': { correct: 0, total: 0 }
  };

  predictions.forEach(pred => {
    const conf = pred.confidence;
    let range: keyof typeof confidenceRanges;
    if (conf <= 0.60) range = '0.55-0.60';
    else if (conf <= 0.65) range = '0.61-0.65';
    else if (conf <= 0.70) range = '0.66-0.70';
    else if (conf <= 0.75) range = '0.71-0.75';
    else if (conf <= 0.80) range = '0.76-0.80';
    else range = '0.81+';

    if (typeof pred.game.homeScore !== 'number' || typeof pred.game.awayScore !== 'number') return;
    const parsedPrediction = parseTotalPrediction(pred.predictionValue);
    if (!parsedPrediction) return;

    const { line, direction } = parsedPrediction;
    const actualTotal = pred.game.homeScore + pred.game.awayScore;
    let actualResult: 'OVER' | 'UNDER' | 'PUSH';
    if (actualTotal > line) actualResult = 'OVER';
    else if (actualTotal < line) actualResult = 'UNDER';
    else actualResult = 'PUSH';

    if (actualResult === 'PUSH') return;
    confidenceRanges[range].total++;
    if (direction === actualResult) confidenceRanges[range].correct++;
  });

  Object.entries(confidenceRanges).forEach(([range, stats]) => {
    if (stats.total > 0) {
      const accuracy = (stats.correct / stats.total) * 100;
      console.log(`${range}: ${accuracy.toFixed(1)}% (${stats.correct}/${stats.total})`);
    }
  });

  // Print some example incorrect predictions
  console.log('\n=== Example Incorrect Predictions ===\n');
  incorrectPredictions
    .sort((a, b) => Math.abs(b.actualTotal - b.line) - Math.abs(a.actualTotal - a.line))
    .slice(0, 5)
    .forEach(pred => {
      console.log(`Game: ${pred.teams}`);
      console.log(`Date: ${pred.date.toLocaleDateString()}`);
      console.log(`Line: ${pred.line}, Actual: ${pred.actualTotal}`);
      console.log(`Model Prediction: ${pred.direction}, Actual Result: ${pred.actualResult}`);
      console.log(`Score: ${pred.awayScore}-${pred.homeScore}`);
      console.log(`Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
      console.log('---');
    });
}

analyzeTotalPredictions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 