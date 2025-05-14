import { PrismaClient } from '@prisma/client';

async function checkGameScores() {
  const prisma = new PrismaClient();

  try {
    const games = await prisma.game.findMany({
      orderBy: {
        gameDate: 'asc',
      },
      select: {
        id: true,
        gameDate: true,
        homeTeamName: true,
        awayTeamName: true,
        homeScore: true,
        awayScore: true,
        status: true,
      },
    });

    const now = new Date();
    const pastGames = games.filter(game => game.gameDate < now);
    const futureGames = games.filter(game => game.gameDate >= now);

    const pastGamesWithScores = pastGames.filter(game => game.homeScore !== null && game.awayScore !== null);
    const pastGamesWithoutScores = pastGames.filter(game => game.homeScore === null || game.awayScore === null);

    console.log(`Total games found: ${games.length}`);
    console.log(`Past games: ${pastGames.length}`);
    console.log(`- With scores: ${pastGamesWithScores.length}`);
    console.log(`- Without scores: ${pastGamesWithoutScores.length}`);
    console.log(`Future games: ${futureGames.length}`);

    if (pastGamesWithoutScores.length > 0) {
      console.log('\nSample of past games missing scores:');
      pastGamesWithoutScores.slice(0, 5).forEach(game => {
        console.log(`${game.gameDate.toISOString()}: ${game.awayTeamName} @ ${game.homeTeamName}`);
      });
    }

    if (pastGamesWithScores.length > 0) {
      console.log('\nSample of past games with scores:');
      pastGamesWithScores.slice(0, 5).forEach(game => {
        console.log(`${game.gameDate.toISOString()}: ${game.awayTeamName} @ ${game.homeTeamName} (${game.awayScore}-${game.homeScore})`);
      });
    }

  } catch (error) {
    console.error('Error checking game scores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGameScores().catch(console.error); 