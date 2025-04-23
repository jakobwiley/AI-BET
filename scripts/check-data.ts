import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Get total counts
    const totalGames = await prisma.game.count();
    const totalPredictions = await prisma.prediction.count();

    console.log('Database Overview:');
    console.log(`Total Games: ${totalGames}`);
    console.log(`Total Predictions: ${totalPredictions}`);

    // Get date range of games
    const firstGame = await prisma.game.findFirst({
      orderBy: { gameDate: 'asc' }
    });

    const lastGame = await prisma.game.findFirst({
      orderBy: { gameDate: 'desc' }
    });

    console.log('\nDate Range:');
    console.log(`First Game: ${firstGame?.gameDate.toLocaleDateString()}`);
    console.log(`Last Game: ${lastGame?.gameDate.toLocaleDateString()}`);

    // Get game count by status
    const gamesByStatus = await prisma.game.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('\nGames by Status:');
    gamesByStatus.forEach(status => {
      console.log(`${status.status}: ${status._count}`);
    });

    // Get prediction outcomes
    const predictionsByOutcome = await prisma.prediction.groupBy({
      by: ['outcome'],
      _count: true
    });

    console.log('\nPredictions by Outcome:');
    predictionsByOutcome.forEach(outcome => {
      console.log(`${outcome.outcome}: ${outcome._count}`);
    });

    // Get most recent games with predictions
    console.log('\nMost Recent Games with Predictions:');
    const recentGames = await prisma.game.findMany({
      take: 5,
      orderBy: { gameDate: 'desc' },
      include: {
        predictions: true
      },
      where: {
        predictions: {
          some: {}
        }
      }
    });

    recentGames.forEach(game => {
      console.log(`\n${game.gameDate.toLocaleDateString()} - ${game.homeTeamName} vs ${game.awayTeamName}`);
      console.log(`Status: ${game.status}`);
      console.log(`Predictions: ${game.predictions.length}`);
    });

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData().catch(console.error); 