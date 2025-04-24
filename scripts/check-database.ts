import { PrismaClient, GameStatus, PredictionOutcome, PredictionType } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

function calculateGrade(confidence: number): string {
  if (confidence >= 0.90) return 'A+';
  if (confidence >= 0.85) return 'A';
  if (confidence >= 0.80) return 'A-';
  if (confidence >= 0.75) return 'B+';
  return 'C';
}

async function checkDatabase() {
  try {
    console.log('🔍 Starting comprehensive database check...\n');

    // 1. Check Games
    console.log('📊 Game Statistics:');
    console.log('------------------');

    const totalGames = await prisma.game.count();
    console.log(`Total games in database: ${totalGames}`);

    // Games by sport
    const gamesBySport = await prisma.game.groupBy({
      by: ['sport'],
      _count: true
    });
    console.log('\nGames by sport:');
    gamesBySport.forEach(sport => {
      console.log(`${sport.sport}: ${sport._count}`);
    });

    // Games by status
    const gamesByStatus = await prisma.game.groupBy({
      by: ['status'],
      _count: true
    });
    console.log('\nGames by status:');
    gamesByStatus.forEach(status => {
      console.log(`${status.status}: ${status._count}`);
    });

    // 2. Check Predictions
    console.log('\n📈 Prediction Statistics:');
    console.log('----------------------');

    const totalPredictions = await prisma.prediction.count();
    console.log(`Total predictions: ${totalPredictions}`);

    // Predictions by type
    const predictionsByType = await prisma.prediction.groupBy({
      by: ['predictionType'],
      _count: true
    });
    console.log('\nPredictions by type:');
    predictionsByType.forEach(type => {
      console.log(`${type.predictionType}: ${type._count}`);
    });

    // Predictions by outcome
    const predictionsByOutcome = await prisma.prediction.groupBy({
      by: ['outcome'],
      _count: true
    });
    console.log('\nPredictions by outcome:');
    predictionsByOutcome.forEach(outcome => {
      console.log(`${outcome.outcome}: ${outcome._count}`);
    });

    // 3. Check Recent Activity
    console.log('\n🕒 Recent Activity:');
    console.log('----------------');

    const recentGames = await prisma.game.findMany({
      take: 5,
      orderBy: { gameDate: 'desc' },
      include: { predictions: true }
    });

    console.log('\nMost recent games:');
    recentGames.forEach(game => {
      console.log(`\n${game.homeTeamName} vs ${game.awayTeamName}`);
      console.log(`Date: ${game.gameDate.toLocaleDateString()}`);
      console.log(`Status: ${game.status}`);
      console.log(`Predictions: ${game.predictions.length}`);
    });

    // 4. Check Data Integrity
    console.log('\n🔍 Data Integrity Checks:');
    console.log('----------------------');

    // Check for games without predictions
    const gamesWithoutPredictions = await prisma.game.count({
      where: {
        predictions: {
          none: {}
        }
      }
    });
    console.log(`Games without predictions: ${gamesWithoutPredictions}`);

    // Check for final games without outcomes
    const finalGamesWithPendingPredictions = await prisma.game.count({
      where: {
        status: GameStatus.FINAL,
        predictions: {
          some: {
            outcome: PredictionOutcome.PENDING
          }
        }
      }
    });
    console.log(`Final games with pending predictions: ${finalGamesWithPendingPredictions}`);

    // Check for games with missing odds
    const gamesWithoutOdds = await prisma.game.count({
      where: {
        oddsJson: {
          not: {
            path: ['$'],
            not: null
          }
        }
      }
    });
    console.log(`Games without odds data: ${gamesWithoutOdds}`);

    // 5. Performance Analysis
    console.log('\n📊 Prediction Performance:');
    console.log('------------------------');

    const predictions = await prisma.prediction.findMany({
      where: {
        outcome: {
          in: [PredictionOutcome.WIN, PredictionOutcome.LOSS]
        }
      },
      select: {
        predictionType: true,
        confidence: true,
        outcome: true
      }
    });

    // Group by type and calculate win rate
    const performanceByType = predictions.reduce((acc, pred) => {
      if (!acc[pred.predictionType]) {
        acc[pred.predictionType] = { wins: 0, total: 0 };
      }
      acc[pred.predictionType].total++;
      if (pred.outcome === PredictionOutcome.WIN) {
        acc[pred.predictionType].wins++;
      }
      return acc;
    }, {} as Record<string, { wins: number; total: number }>);

    console.log('\nWin rates by prediction type:');
    Object.entries(performanceByType).forEach(([type, stats]) => {
      const winRate = (stats.wins / stats.total * 100).toFixed(2);
      console.log(`${type}: ${winRate}% (${stats.wins}/${stats.total})`);
    });

  } catch (error) {
    console.error('Error during database check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkDatabaseState() {
  try {
    // Get total counts
    const totalGames = await prisma.game.count();
    const totalPredictions = await prisma.prediction.count();

    console.log(`Total games in database: ${totalGames}`);
    console.log(`Total predictions in database: ${totalPredictions}`);
    console.log('\nSample of 5 recent games:');

    // Get 5 sample games with their predictions
    const games = await prisma.game.findMany({
      take: 5,
      orderBy: {
        gameDate: 'desc'
      },
      include: {
        predictions: true
      }
    });

    games.forEach(game => {
      console.log('\n----------------------------------------');
      console.log(`Game: ${game.homeTeamName} vs ${game.awayTeamName}`);
      console.log(`Date: ${game.gameDate}`);
      console.log(`Status: ${game.status}`);
      console.log(`Score: ${game.homeScore ?? 'N/A'} - ${game.awayScore ?? 'N/A'}`);
      console.log(`Number of predictions: ${game.predictions.length}`);
      
      if (game.predictions.length > 0) {
        console.log('\nPredictions:');
        game.predictions.forEach(pred => {
          console.log(`- Type: ${pred.predictionType}, Value: ${pred.predictionValue}, Confidence: ${pred.confidence}, Outcome: ${pred.outcome}`);
        });
      }
    });

  } catch (error) {
    console.error('Error checking database state:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDatabase().catch(console.error);
checkDatabaseState().catch(console.error); 