import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePredictions() {
  try {
    // Get all predictions
    const predictions = await prisma.prediction.findMany({
      include: {
        game: true
      }
    });

    console.log(`\nTotal Predictions: ${predictions.length}`);

    // Analyze by prediction type
    const analysisByType: Record<PredictionType, {
      total: number;
      wins: number;
      losses: number;
      pending: number;
      pushes: number;
      winRate: number;
    }> = {
      [PredictionType.MONEYLINE]: { total: 0, wins: 0, losses: 0, pending: 0, pushes: 0, winRate: 0 },
      [PredictionType.SPREAD]: { total: 0, wins: 0, losses: 0, pending: 0, pushes: 0, winRate: 0 },
      [PredictionType.TOTAL]: { total: 0, wins: 0, losses: 0, pending: 0, pushes: 0, winRate: 0 }
    };

    // Issues tracking
    const issues = {
      missingScores: new Set<string>(),
      invalidValues: [] as { id: string, type: PredictionType, value: string }[],
      pendingFinalGames: [] as string[]
    };

    // Analyze each prediction
    predictions.forEach(pred => {
      const stats = analysisByType[pred.predictionType];
      stats.total++;

      // Track outcome
      switch (pred.outcome) {
        case PredictionOutcome.WIN:
          stats.wins++;
          break;
        case PredictionOutcome.LOSS:
          stats.losses++;
          break;
        case PredictionOutcome.PENDING:
          stats.pending++;
          if (pred.game.status === 'FINAL') {
            issues.pendingFinalGames.push(pred.id);
          }
          break;
        case PredictionOutcome.PUSH:
          stats.pushes++;
          break;
      }

      // Check for missing scores in final games
      if (pred.game.status === 'FINAL' && (pred.game.homeScore === null || pred.game.awayScore === null)) {
        issues.missingScores.add(pred.game.id);
      }

      // Check for potentially invalid values
      switch (pred.predictionType) {
        case PredictionType.TOTAL:
          if (!pred.predictionValue.startsWith('o') && !pred.predictionValue.startsWith('u')) {
            issues.invalidValues.push({
              id: pred.id,
              type: pred.predictionType,
              value: pred.predictionValue
            });
          }
          break;
        case PredictionType.SPREAD:
          if (pred.predictionValue === '0') {
            issues.invalidValues.push({
              id: pred.id,
              type: pred.predictionType,
              value: pred.predictionValue
            });
          }
          break;
        case PredictionType.MONEYLINE:
          if (['0', '1', '-1'].includes(pred.predictionValue)) {
            issues.invalidValues.push({
              id: pred.id,
              type: pred.predictionType,
              value: pred.predictionValue
            });
          }
          break;
      }
    });

    // Calculate win rates
    Object.values(analysisByType).forEach(stats => {
      const decidedGames = stats.wins + stats.losses;
      stats.winRate = decidedGames > 0 ? (stats.wins / decidedGames) * 100 : 0;
    });

    // Print performance analysis
    console.log('\nPerformance Analysis by Type:');
    console.log('----------------------------------------');
    Object.entries(analysisByType).forEach(([type, stats]) => {
      console.log(`\n${type}:`);
      console.log(`Total: ${stats.total}`);
      console.log(`Wins: ${stats.wins}`);
      console.log(`Losses: ${stats.losses}`);
      console.log(`Pushes: ${stats.pushes}`);
      console.log(`Pending: ${stats.pending}`);
      console.log(`Win Rate: ${stats.winRate.toFixed(2)}%`);
    });

    // Print issues
    console.log('\nIssues Found:');
    console.log('----------------------------------------');
    console.log(`\nGames with Missing Scores: ${issues.missingScores.size}`);
    issues.missingScores.forEach(gameId => {
      console.log(`  - ${gameId}`);
    });

    console.log(`\nInvalid Prediction Values: ${issues.invalidValues.length}`);
    issues.invalidValues.forEach(issue => {
      console.log(`  - ${issue.id} (${issue.type}): ${issue.value}`);
    });

    console.log(`\nPending Predictions for Final Games: ${issues.pendingFinalGames.length}`);
    issues.pendingFinalGames.forEach(predId => {
      console.log(`  - ${predId}`);
    });

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePredictions().catch(console.error); 