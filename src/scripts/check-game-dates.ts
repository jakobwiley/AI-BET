import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

async function checkGameDates() {
  const predictions = await prisma.prediction.findMany({
    include: {
      game: true
    },
    orderBy: {
      game: {
        gameDate: 'asc'
      }
    }
  });

  console.log('\nGAME DATES WITH PREDICTIONS\n');
  console.log(`Found ${predictions.length} total predictions\n`);

  const dateGroups = predictions.reduce((acc, pred) => {
    const date = format(pred.game.gameDate, 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = {
        count: 0,
        games: new Set()
      };
    }
    acc[date].count++;
    acc[date].games.add(pred.game.id);
    return acc;
  }, {});

  Object.entries(dateGroups).forEach(([date, info]: [string, any]) => {
    console.log(`Date: ${date}`);
    console.log(`Total Predictions: ${info.count}`);
    console.log(`Unique Games: ${info.games.size}\n`);
  });
}

// Run if called directly
(async () => {
  try {
    await checkGameDates();
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})(); 