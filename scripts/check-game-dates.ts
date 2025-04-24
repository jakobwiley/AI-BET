import { PrismaClient } from '@prisma/client';

async function checkGameDates() {
  const prisma = new PrismaClient();

  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        gameDate: true,
        status: true,
      },
      orderBy: {
        gameDate: 'asc',
      },
    });

    console.log(`Found ${games.length} games:`);
    games.forEach(game => {
      console.log(`${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`  Date: ${game.gameDate}`);
      console.log(`  Status: ${game.status}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error checking game dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGameDates().catch(console.error); 