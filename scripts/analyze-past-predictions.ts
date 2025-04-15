import { PrismaClient, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePastPredictions() {
  try {
    // Get all past predictions
    const predictions = await prisma.prediction.findMany({
      include: {
        game: true
      },
      where: {
        game: {
          gameDate: {
            lt: new Date()
          }
        }
      }
    });

    console.log(`\n📊 Analysis of Past Predictions`);
    console.log(`================================`);
    console.log(`Total predictions analyzed: ${predictions.length}`);

    // Analyze by outcome
    const outcomeStats = predictions.reduce((acc, pred) => {
      acc[pred.outcome] = (acc[pred.outcome] || 0) + 1;
      return acc;
    }, {} as Record<PredictionOutcome, number>);

    console.log('\nOutcome Distribution:');
    Object.entries(outcomeStats).forEach(([outcome, count]) => {
      const percentage = ((count / predictions.length) * 100).toFixed(1);
      console.log(`${outcome}: ${count} (${percentage}%)`);
    });

    // Analyze by prediction type
    const typeStats = predictions.reduce((acc, pred) => {
      acc[pred.predictionType] = acc[pred.predictionType] || { total: 0, wins: 0 };
      acc[pred.predictionType].total++;
      if (pred.outcome === 'WIN') {
        acc[pred.predictionType].wins++;
      }
      return acc;
    }, {} as Record<string, { total: number; wins: number }>);

    console.log('\nPerformance by Prediction Type:');
    Object.entries(typeStats).forEach(([type, stats]) => {
      const winRate = ((stats.wins / stats.total) * 100).toFixed(1);
      console.log(`${type}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Wins: ${stats.wins}`);
      console.log(`  Win Rate: ${winRate}%`);
    });

    // Analyze by confidence level
    const confidenceBuckets = predictions.reduce((acc, pred) => {
      const bucket = Math.floor(pred.confidence * 10) / 10;
      acc[bucket] = acc[bucket] || { total: 0, wins: 0 };
      acc[bucket].total++;
      if (pred.outcome === 'WIN') {
        acc[bucket].wins++;
      }
      return acc;
    }, {} as Record<number, { total: number; wins: number }>);

    console.log('\nPerformance by Confidence Level:');
    Object.entries(confidenceBuckets)
      .sort(([a], [b]) => Number(b) - Number(a))
      .forEach(([confidence, stats]) => {
        const winRate = ((stats.wins / stats.total) * 100).toFixed(1);
        console.log(`${(Number(confidence) * 100).toFixed(0)}%:`);
        console.log(`  Total: ${stats.total}`);
        console.log(`  Wins: ${stats.wins}`);
        console.log(`  Win Rate: ${winRate}%`);
      });

    // Recent performance (last 20 predictions)
    const recentPredictions = predictions
      .sort((a, b) => b.game.gameDate.getTime() - a.game.gameDate.getTime())
      .slice(0, 20);

    console.log('\nRecent Performance (Last 20 Predictions):');
    recentPredictions.forEach(pred => {
      const result = pred.outcome === 'WIN' ? '✅' : pred.outcome === 'LOSS' ? '❌' : '⏳';
      console.log(`${result} ${pred.game.homeTeamName} vs ${pred.game.awayTeamName}`);
      console.log(`   Type: ${pred.predictionType}, Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${pred.reasoning}`);
    });

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePastPredictions(); 