import pkg from '@prisma/client';
const { PrismaClient, SportType } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function listGames() {
  try {
    // Get all MLB games
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    console.log(`Found ${games.length} MLB games in total\n`);

    // Group games by date
    const gamesByDate = games.reduce((acc, game) => {
      const date = new Date(game.gameDate).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(game);
      return acc;
    }, {} as Record<string, typeof games>);

    // Print games by date
    Object.entries(gamesByDate).forEach(([date, gamesOnDate]) => {
      console.log(`\n${date} (${gamesOnDate.length} games):`);
      gamesOnDate.forEach(game => {
        console.log(`  ${game.homeTeamName} vs ${game.awayTeamName} (${new Date(game.gameDate).toLocaleTimeString()})`);
      });
    });

  } catch (error) {
    console.error('Error listing games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listGames(); 