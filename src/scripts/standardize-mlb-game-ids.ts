import { PrismaClient, SportType } from '@prisma/client';
import { MLBStatsService } from '../lib/mlbStatsApi.js';

const prisma = new PrismaClient();

async function standardizeMLBGameIds() {
  try {
    console.log('Starting MLB game ID standardization...');

    // Find all MLB games
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB
      }
    });

    // Filter for games with non-numeric IDs
    const nonNumericGames = games.filter(game => !/^\d+$/.test(game.id));
    console.log(`Found ${nonNumericGames.length} games with non-numeric IDs`);

    for (const game of nonNumericGames) {
      try {
        console.log(`\nProcessing game: ${game.awayTeamName} @ ${game.homeTeamName} (${game.gameDate})`);
        console.log(`Old ID: ${game.id}`);

        // Search for the game in MLB API
        const mlbGames = await MLBStatsService.searchGames(
          game.awayTeamName,
          game.homeTeamName,
          game.gameDate
        );

        if (mlbGames.length === 0) {
          console.log(`No matching game found in MLB API for ${game.id}`);
          continue;
        }

        const mlbGame = mlbGames[0];
        const newId = mlbGame.gamePk.toString();
        console.log(`Numeric MLB game ID: ${newId}`);

        // Check if a game with the numeric ID already exists
        const existingGame = await prisma.game.findUnique({ where: { id: newId } });
        if (!existingGame) {
          console.log(`No existing game found with numeric ID ${newId}. Skipping. (This should not happen if previous script ran)`);
          continue;
        }

        // Update any related records (predictions, etc.)
        const predictionUpdate = await prisma.prediction.updateMany({
          where: { gameId: game.id },
          data: { gameId: newId }
        });
        if (predictionUpdate.count > 0) {
          console.log(`Updated ${predictionUpdate.count} predictions to use new game ID.`);
        }

        // Delete the old game record
        await prisma.game.delete({ where: { id: game.id } });
        console.log(`Deleted old game record with ID ${game.id}`);
      } catch (error) {
        console.error(`Error processing game ${game.id}:`, error);
      }
    }

    console.log('\nMLB game ID deduplication and cleanup complete!');
  } catch (error) {
    console.error('Error in standardization process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the standardization
standardizeMLBGameIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 