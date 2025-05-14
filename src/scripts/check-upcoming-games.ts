import { PrismaClient } from '@prisma/client';
import { format, addDays } from 'date-fns';

const prisma = new PrismaClient();

async function checkUpcomingGames() {
  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = addDays(tomorrow, 1);

  const games = await prisma.game.findMany({
    where: {
      gameDate: {
        gte: tomorrow,
        lt: dayAfter
      }
    },
    orderBy: {
      gameDate: 'asc'
    }
  });

  console.log('\nUPCOMING GAMES\n');
  console.log(`Date: ${format(tomorrow, 'yyyy-MM-dd')}`);
  console.log(`Found ${games.length} games:\n`);

  games.forEach(game => {
    const gameTime = format(game.gameDate, 'h:mm a');
    console.log(`${game.awayTeamName} @ ${game.homeTeamName}`);
    console.log(`Time: ${gameTime}`);
    console.log(`Status: ${game.status}\n`);
  });
}

// Run if called directly
(async () => {
  try {
    await checkUpcomingGames();
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})(); 