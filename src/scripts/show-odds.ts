import { PrismaClient, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function showTodaysOdds() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const games = await prisma.game.findMany({
    where: {
      gameDate: {
        gte: today,
        lt: tomorrow
      },
      status: GameStatus.SCHEDULED,
      oddsJson: { not: null }
    }
  });

  if (games.length === 0) {
    console.log('No scheduled games with odds found for today.');
    return;
  }

  games.forEach(game => {
    console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
    console.log('Game Time:', game.gameDate);
    console.log('Odds:', JSON.stringify(game.oddsJson, null, 2));
  });

  await prisma.$disconnect();
}

showTodaysOdds().catch(console.error); 