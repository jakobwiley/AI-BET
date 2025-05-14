import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const today = new Date('2025-04-24T00:00:00.000Z');
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: nextWeek
        },
        status: 'SCHEDULED'
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    console.log(`Found ${games.length} scheduled games for the next week`);
    
    games.forEach(game => {
      console.log('\nGame:', {
        teams: `${game.awayTeamName} @ ${game.homeTeamName}`,
        date: game.gameDate,
        status: game.status
      });
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

main(); 