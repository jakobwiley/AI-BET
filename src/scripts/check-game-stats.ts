import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGameStats() {
  try {
    // Use April 23, 2025 as the reference date
    const now = new Date(2025, 3, 23); // April 23, 2025
    console.log(`Reference date: ${now.toISOString()}`);
    
    // Get all games
    const allGames = await prisma.game.findMany({
      orderBy: {
        gameDate: 'asc'
      }
    });
    
    // Count future games
    const futureGames = allGames.filter(game => {
      const gameDate = new Date(game.gameDate);
      return gameDate.toISOString().split('T')[0] > now.toISOString().split('T')[0];
    });
    
    // Count past games
    const pastGames = allGames.filter(game => {
      const gameDate = new Date(game.gameDate);
      return gameDate.toISOString().split('T')[0] <= now.toISOString().split('T')[0];
    });
    
    // Count games with missing scores
    const gamesWithMissingScores = allGames.filter(
      game => game.homeScore === null || game.awayScore === null
    );

    console.log('\nGame Statistics:');
    console.log(`Total games: ${allGames.length}`);
    console.log(`Past games (up to Apr 23): ${pastGames.length} (${((pastGames.length / allGames.length) * 100).toFixed(1)}%)`);
    console.log(`Future games (Apr 24+): ${futureGames.length} (${((futureGames.length / allGames.length) * 100).toFixed(1)}%)`);
    console.log(`Games with missing scores: ${gamesWithMissingScores.length} (${((gamesWithMissingScores.length / allGames.length) * 100).toFixed(1)}%)`);

    console.log('\nDate Range:');
    if (allGames.length > 0) {
      console.log(`Earliest game: ${allGames[0].gameDate.toISOString()} (${allGames[0].awayTeamName} @ ${allGames[0].homeTeamName})`);
      console.log(`Latest game: ${allGames[allGames.length - 1].gameDate.toISOString()} (${allGames[allGames.length - 1].awayTeamName} @ ${allGames[allGames.length - 1].homeTeamName})`);
    }

    // List games with missing scores that are in the past
    const pastGamesWithMissingScores = pastGames.filter(
      game => game.homeScore === null || game.awayScore === null
    );
    
    if (pastGamesWithMissingScores.length > 0) {
      console.log('\nPast games with missing scores:');
      pastGamesWithMissingScores.forEach(game => {
        console.log(`${game.gameDate.toISOString().split('T')[0]}: ${game.awayTeamName} @ ${game.homeTeamName}`);
      });
    }

  } catch (error) {
    console.error('Error checking game stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGameStats().catch(console.error); 