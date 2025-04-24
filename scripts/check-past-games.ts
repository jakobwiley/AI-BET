import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

async function checkPastGames() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all games before today
    const pastGames = await prisma.game.findMany({
      where: {
        gameDate: {
          lt: today
        }
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    console.log(`\n=== Past Games Analysis ===`);
    console.log(`Total past games found: ${pastGames.length}`);

    // Group by sport
    const sportCounts = pastGames.reduce((acc, game) => {
      acc[game.sport] = (acc[game.sport] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nGames by sport:');
    Object.entries(sportCounts).forEach(([sport, count]) => {
      console.log(`${sport}: ${count} games`);
    });

    // Show sample of past games
    console.log('\nMost recent past games:');
    pastGames.slice(0, 5).forEach(game => {
      console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Date: ${format(game.gameDate, 'MMM d, yyyy')}`);
      console.log(`Status: ${game.status}`);
      console.log(`Game ID: ${game.id}`);
      console.log(`Predictions: ${game.predictions.length}`);
    });

    // Count games by status
    const statusCounts = pastGames.reduce((acc, game) => {
      acc[game.status] = (acc[game.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nGames by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count} games`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPastGames(); 