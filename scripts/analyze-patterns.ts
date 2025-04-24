import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

interface ConfidenceStats {
  total: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  byType: {
    [key in PredictionType]: {
      total: number;
      wins: number;
      losses: number;
      pushes: number;
      winRate: number;
    }
  }
}

async function analyzePatterns() {
  try {
    // Get all predictions for completed games
    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          status: 'FINAL'
        }
      },
      include: {
        game: true
      },
      orderBy: {
        confidence: 'desc'
      }
    });

    console.log(`\nAnalyzing ${predictions.length} predictions from completed games`);

    // Group predictions by confidence level (rounded to nearest 5%)
    const confidenceGroups: { [key: string]: ConfidenceStats } = {};
    const highConfidenceWins: any[] = [];
    const highConfidenceLosses: any[] = [];

    predictions.forEach(pred => {
      // Round confidence to nearest 5%
      const confidencePercent = Math.round(pred.confidence * 100);
      const confidenceKey = `${confidencePercent}%`;

      // Initialize confidence group if it doesn't exist
      if (!confidenceGroups[confidenceKey]) {
        confidenceGroups[confidenceKey] = {
          total: 0,
          wins: 0,
          losses: 0,
          pushes: 0,
          winRate: 0,
          byType: {
            [PredictionType.MONEYLINE]: { total: 0, wins: 0, losses: 0, pushes: 0, winRate: 0 },
            [PredictionType.SPREAD]: { total: 0, wins: 0, losses: 0, pushes: 0, winRate: 0 },
            [PredictionType.TOTAL]: { total: 0, wins: 0, losses: 0, pushes: 0, winRate: 0 }
          }
        };
      }

      const stats = confidenceGroups[confidenceKey];
      const typeStats = stats.byType[pred.predictionType];
      
      stats.total++;
      typeStats.total++;

      // Track outcomes
      switch (pred.outcome) {
        case PredictionOutcome.WIN:
          stats.wins++;
          typeStats.wins++;
          if (pred.confidence >= 0.85) {
            highConfidenceWins.push({
              id: pred.id,
              type: pred.predictionType,
              value: pred.predictionValue,
              confidence: pred.confidence,
              game: `${pred.game.awayTeamName} @ ${pred.game.homeTeamName}`,
              score: `${pred.game.awayScore}-${pred.game.homeScore}`
            });
          }
          break;
        case PredictionOutcome.LOSS:
          stats.losses++;
          typeStats.losses++;
          if (pred.confidence >= 0.85) {
            highConfidenceLosses.push({
              id: pred.id,
              type: pred.predictionType,
              value: pred.predictionValue,
              confidence: pred.confidence,
              game: `${pred.game.awayTeamName} @ ${pred.game.homeTeamName}`,
              score: `${pred.game.awayScore}-${pred.game.homeScore}`
            });
          }
          break;
        case PredictionOutcome.PUSH:
          stats.pushes++;
          typeStats.pushes++;
          break;
      }
    });

    // Calculate win rates
    Object.values(confidenceGroups).forEach(stats => {
      const decidedGames = stats.wins + stats.losses;
      stats.winRate = decidedGames > 0 ? (stats.wins / decidedGames) * 100 : 0;

      // Calculate win rates by type
      Object.values(stats.byType).forEach(typeStats => {
        const typeDecidedGames = typeStats.wins + typeStats.losses;
        typeStats.winRate = typeDecidedGames > 0 ? (typeStats.wins / typeDecidedGames) * 100 : 0;
      });
    });

    // Print analysis by confidence level
    console.log('\nPerformance by Confidence Level:');
    console.log('----------------------------------------');
    Object.entries(confidenceGroups)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
      .forEach(([confidence, stats]) => {
        console.log(`\nConfidence ${confidence}:`);
        console.log(`Total: ${stats.total}`);
        console.log(`Wins: ${stats.wins}`);
        console.log(`Losses: ${stats.losses}`);
        console.log(`Pushes: ${stats.pushes}`);
        console.log(`Win Rate: ${stats.winRate.toFixed(2)}%`);

        // Print type breakdown for this confidence level
        Object.entries(stats.byType).forEach(([type, typeStats]) => {
          if (typeStats.total > 0) {
            console.log(`\n  ${type}:`);
            console.log(`  Total: ${typeStats.total}`);
            console.log(`  Wins: ${typeStats.wins}`);
            console.log(`  Losses: ${typeStats.losses}`);
            console.log(`  Pushes: ${typeStats.pushes}`);
            console.log(`  Win Rate: ${typeStats.winRate.toFixed(2)}%`);
          }
        });
      });

    // Print high confidence analysis
    console.log('\nHigh Confidence (85%+) Wins:');
    console.log('----------------------------------------');
    highConfidenceWins.forEach(win => {
      console.log(`\n${win.game} (${win.score})`);
      console.log(`Type: ${win.type}`);
      console.log(`Value: ${win.value}`);
      console.log(`Confidence: ${(win.confidence * 100).toFixed(0)}%`);
    });

    console.log('\nHigh Confidence (85%+) Losses:');
    console.log('----------------------------------------');
    highConfidenceLosses.forEach(loss => {
      console.log(`\n${loss.game} (${loss.score})`);
      console.log(`Type: ${loss.type}`);
      console.log(`Value: ${loss.value}`);
      console.log(`Confidence: ${(loss.confidence * 100).toFixed(0)}%`);
    });

    // Calculate high confidence summary
    const highConfidenceTotal = highConfidenceWins.length + highConfidenceLosses.length;
    const highConfidenceWinRate = (highConfidenceWins.length / highConfidenceTotal) * 100;

    console.log('\nHigh Confidence Summary:');
    console.log('----------------------------------------');
    console.log(`Total Predictions: ${highConfidenceTotal}`);
    console.log(`Wins: ${highConfidenceWins.length}`);
    console.log(`Losses: ${highConfidenceLosses.length}`);
    console.log(`Win Rate: ${highConfidenceWinRate.toFixed(2)}%`);

  } catch (error) {
    console.error('Error analyzing patterns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePatterns().catch(console.error); 