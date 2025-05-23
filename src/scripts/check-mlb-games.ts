import { PrismaClient, SportType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  console.log('\nDate Range:');
  console.log('-----------');
  console.log(`Current date: ${today.toISOString()}`);
  console.log(`30 days ago: ${thirtyDaysAgo.toISOString()}`);

  // Get all MLB games to check the date range
  const allGames = await prisma.game.findMany({
    where: {
      sport: SportType.MLB
    },
    select: {
      gameDate: true
    },
    orderBy: {
      gameDate: 'asc'
    }
  });

  console.log('\nDatabase Statistics:');
  console.log('-------------------');
  console.log(`Total MLB games in database: ${allGames.length}`);
  console.log(`Earliest game: ${allGames[0]?.gameDate}`);
  console.log(`Latest game: ${allGames[allGames.length - 1]?.gameDate}`);

  // Now get games from last 30 days, up to today (exclude future games)
  const recentGames = await prisma.game.findMany({
    where: {
      sport: SportType.MLB,
      gameDate: {
        gte: thirtyDaysAgo,
        lte: today
      }
    },
    include: {
      predictions: true
    },
    orderBy: {
      gameDate: 'desc'
    }
  });

  // Group games by date to validate
  const gamesByDate = recentGames.reduce((acc, game) => {
    const date = game.gameDate.toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nRecent Games Analysis:');
  console.log('---------------------');
  console.log(`Games in last 30 days: ${recentGames.length}`);
  console.log(`Unique dates with games: ${Object.keys(gamesByDate).length}`);
  
  console.log('\nGames per day (last 5 days):');
  Object.entries(gamesByDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)
    .forEach(([date, count]) => {
      console.log(`${date}: ${count} games`);
    });

  // Show some example games
  console.log('\nMost Recent Games:');
  recentGames.slice(0, 5).forEach(game => {
    console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
    console.log(`Date: ${game.gameDate}`);
    console.log(`Status: ${game.status}`);
    console.log(`Predictions: ${game.predictions?.length || 0}`);
    if (game.predictions?.length) {
      console.log('Prediction Details:');
      game.predictions.forEach(p => {
        console.log(`  ${p.predictionType}: Value=${p.predictionValue}, Outcome=${p.outcome || 'PENDING'}`);
      });
    }
  });

  await prisma.$disconnect();
}

main().catch(console.error); 