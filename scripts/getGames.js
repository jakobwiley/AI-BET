import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getGames() {
  try {
    const games = await prisma.game.findMany({
      orderBy: { gameDate: 'desc' },
      take: 10
    });
    console.log('Most recent games:');
    games.forEach(game => {
      console.log({
        id: game.id,
        home: game.homeTeamName,
        away: game.awayTeamName,
        date: game.gameDate,
        status: game.status
      });
    });
  } catch (error) {
    console.error('Error fetching games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getGames(); 