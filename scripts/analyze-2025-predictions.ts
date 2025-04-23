import { PrismaClient, SportType, PredictionType, PredictionOutcome, GameStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function analyzePredictions() {
  try {
    // Set date range to what we have in the database
    const startDate = new Date('2025-04-09');
    const endDate = new Date('2025-04-13');
    endDate.setHours(23, 59, 59, 999);

    console.log('🏆 2025 MLB Season Analysis\n');
    console.log(`Date Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n`);

    // 1. Games Overview
    console.log('📊 Games Overview:');
    console.log('----------------');

    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    const mlbGames = games.filter(g => g.sport === SportType.MLB);
    console.log(`Total MLB games in period: ${mlbGames.length}`);

    // Games by date
    const gamesByDate = mlbGames.reduce((acc, game) => {
      const date = game.gameDate.toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(game);
      return acc;
    }, {} as Record<string, typeof games>);

    console.log('\nGames by date:');
    Object.entries(gamesByDate).forEach(([date, gamesOnDate]) => {
      console.log(`${date}: ${gamesOnDate.length} games`);
    });

    // 2. Predictions Analysis
    console.log('\n📈 Prediction Analysis:');
    console.log('-------------------');

    const predictions = mlbGames.flatMap(g => g.predictions);
    console.log(`\nTotal predictions: ${predictions.length}`);

    // Predictions by type
    const predictionsByType = predictions.reduce((acc, pred) => {
      if (!acc[pred.predictionType]) {
        acc[pred.predictionType] = { total: 0, pending: 0, wins: 0, losses: 0 };
      }
      acc[pred.predictionType].total++;
      if (pred.outcome === PredictionOutcome.PENDING) {
        acc[pred.predictionType].pending++;
      } else if (pred.outcome === PredictionOutcome.WIN) {
        acc[pred.predictionType].wins++;
      } else if (pred.outcome === PredictionOutcome.LOSS) {
        acc[pred.predictionType].losses++;
      }
      return acc;
    }, {} as Record<string, { total: number; pending: number; wins: number; losses: number }>);

    console.log('\nBreakdown by prediction type:');
    Object.entries(predictionsByType).forEach(([type, stats]) => {
      const completedPredictions = stats.wins + stats.losses;
      const winRate = completedPredictions > 0 ? 
        ((stats.wins / completedPredictions) * 100).toFixed(1) : 'N/A';
      
      console.log(`\n${type}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Completed: ${completedPredictions} (${stats.pending} pending)`);
      console.log(`  Win Rate: ${winRate}% (${stats.wins}/${completedPredictions})`);
    });

    // 3. Confidence Analysis
    console.log('\n🎯 Confidence Analysis:');
    console.log('-------------------');

    const completedPredictions = predictions.filter(p => 
      p.outcome === PredictionOutcome.WIN || p.outcome === PredictionOutcome.LOSS
    );

    const confidenceBands = [
      { label: 'High (≥80%)', min: 0.8, max: 1.0 },
      { label: 'Medium (65-79%)', min: 0.65, max: 0.799 },
      { label: 'Low (<65%)', min: 0, max: 0.649 }
    ];

    confidenceBands.forEach(band => {
      const bandPredictions = completedPredictions.filter(p => 
        p.confidence >= band.min && p.confidence <= band.max
      );
      
      const wins = bandPredictions.filter(p => p.outcome === PredictionOutcome.WIN).length;
      const total = bandPredictions.length;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 'N/A';

      console.log(`\n${band.label}:`);
      console.log(`  Win Rate: ${winRate}% (${wins}/${total})`);
    });

    // 4. Recent Performance
    console.log('\n🕒 Recent Performance:');
    console.log('------------------');

    const lastDay = new Date(endDate);
    lastDay.setDate(lastDay.getDate());
    lastDay.setHours(0, 0, 0, 0);

    const recentPredictions = completedPredictions.filter(p => {
      const predGame = mlbGames.find(g => g.id === p.gameId);
      return predGame && predGame.gameDate >= lastDay;
    });

    const recentWins = recentPredictions.filter(p => p.outcome === PredictionOutcome.WIN).length;
    const recentWinRate = recentPredictions.length > 0 ? 
      ((recentWins / recentPredictions.length) * 100).toFixed(1) : 'N/A';

    console.log(`\nLast day (${lastDay.toLocaleDateString()}):`);
    console.log(`  Win Rate: ${recentWinRate}% (${recentWins}/${recentPredictions.length})`);

  } catch (error) {
    console.error('Error analyzing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePredictions().catch(console.error); 