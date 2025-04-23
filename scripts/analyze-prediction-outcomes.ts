import { PrismaClient, PredictionType, PredictionOutcome, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface GradeStats {
  wins: number;
  losses: number;
  total: number;
  winPercentage: number;
}

interface PredictionTypeStats {
  [grade: string]: GradeStats;
}

// Calculate grade based on confidence level
function calculateGrade(confidence: number): string {
  // Convert to percentage if in decimal form
  const confidencePercent = confidence > 1 ? confidence : confidence * 100;
  
  if (confidencePercent >= 90) return 'A+';
  if (confidencePercent >= 85) return 'A';
  if (confidencePercent >= 80) return 'A-';
  if (confidencePercent >= 75) return 'B+';
  if (confidencePercent >= 70) return 'B';
  if (confidencePercent >= 65) return 'B-';
  if (confidencePercent >= 60) return 'C+';
  return 'C';
}

async function analyzePredictionOutcomes() {
  try {
    console.log('Analyzing prediction outcomes...');
    
    // Get all completed games and their predictions
    const games = await prisma.game.findMany({
      where: {
        status: GameStatus.FINAL
      },
      include: {
        predictions: {
          where: {
            outcome: {
              in: [PredictionOutcome.WIN, PredictionOutcome.LOSS]
            }
          }
        }
      }
    });

    console.log(`Found ${games.length} completed games`);
    const totalPredictions = games.reduce((acc, game) => acc + game.predictions.length, 0);
    console.log(`Total predictions: ${totalPredictions}`);

    // Initialize stats objects for each prediction type
    const stats: Record<PredictionType, PredictionTypeStats> = {
      SPREAD: {},
      MONEYLINE: {},
      TOTAL: {}
    };

    // Process each game's predictions
    for (const game of games) {
      for (const prediction of game.predictions) {
        const grade = calculateGrade(prediction.confidence);
        const type = prediction.predictionType;
        
        // Initialize grade stats if not exists
        if (!stats[type][grade]) {
          stats[type][grade] = {
            wins: 0,
            losses: 0,
            total: 0,
            winPercentage: 0
          };
        }

        // Update stats
        stats[type][grade].total++;
        if (prediction.outcome === PredictionOutcome.WIN) {
          stats[type][grade].wins++;
        } else {
          stats[type][grade].losses++;
        }
      }
    }

    // Calculate win percentages and print results
    console.log('\nPrediction Outcomes by Type and Grade:');
    console.log('=====================================');

    for (const [type, typeStats] of Object.entries(stats)) {
      console.log(`\n${type} Predictions:`);
      console.log('------------------');
      
      // Sort grades by win percentage
      const sortedGrades = Object.entries(typeStats).map(([grade, stats]) => {
        stats.winPercentage = (stats.wins / stats.total) * 100;
        return [grade, stats] as [string, GradeStats];
      }).sort(([, a], [, b]) => b.winPercentage - a.winPercentage);

      let totalWins = 0;
      let totalGames = 0;

      for (const [grade, gradeStats] of sortedGrades) {
        console.log(`${grade}:`);
        console.log(`  Total: ${gradeStats.total}`);
        console.log(`  Wins: ${gradeStats.wins}`);
        console.log(`  Losses: ${gradeStats.losses}`);
        console.log(`  Win %: ${gradeStats.winPercentage.toFixed(1)}%`);
        totalWins += gradeStats.wins;
        totalGames += gradeStats.total;
      }

      // Print overall stats for this prediction type
      if (totalGames > 0) {
        const overallWinPct = (totalWins / totalGames) * 100;
        console.log(`\nOverall ${type}:`);
        console.log(`  Total: ${totalGames}`);
        console.log(`  Wins: ${totalWins}`);
        console.log(`  Losses: ${totalGames - totalWins}`);
        console.log(`  Win %: ${overallWinPct.toFixed(1)}%`);
      }
    }

  } catch (error) {
    console.error('Error analyzing prediction outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzePredictionOutcomes();