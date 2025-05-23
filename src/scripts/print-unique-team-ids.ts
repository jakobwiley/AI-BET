import { PrismaClient, SportType } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function printUniqueTeamIds() {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const games = await prisma.game.findMany({
    where: {
      sport: SportType.MLB,
      gameDate: {
        gte: thirtyDaysAgo,
        lt: new Date()
      }
    },
    select: {
      homeTeamId: true,
      awayTeamId: true
    }
  });

  const homeTeamIds = new Set<string>();
  const awayTeamIds = new Set<string>();

  for (const game of games) {
    if (game.homeTeamId) homeTeamIds.add(game.homeTeamId);
    if (game.awayTeamId) awayTeamIds.add(game.awayTeamId);
  }

  console.log('Unique homeTeamId values:');
  console.log([...homeTeamIds].sort());
  console.log('\nUnique awayTeamId values:');
  console.log([...awayTeamIds].sort());

  await prisma.$disconnect();
}

printUniqueTeamIds(); 