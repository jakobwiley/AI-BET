import { PrismaClient, SportType } from '@prisma/client';
import { MLBStatsService } from '../lib/mlbStatsApi.ts';

const prisma = new PrismaClient();

// Helper function to normalize team names for fuzzy matching
function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper function to check if two team names are a close match
function isCloseMatch(name1: string, name2: string): boolean {
  const normalized1 = normalizeTeamName(name1);
  const normalized2 = normalizeTeamName(name2);
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

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

        // Extract the date part only (ignoring time)
        const gameDate = new Date(game.gameDate.toISOString().split('T')[0]);

        // Search for the game in MLB API using only the date
        const mlbGames = await MLBStatsService.searchGames(
          game.awayTeamName,
          game.homeTeamName,
          gameDate
        );

        if (mlbGames.length === 0) {
          console.log(`No matching game found in MLB API for ${game.id}`);
          continue;
        }

        // Check for close matches in team names
        const closeMatches = mlbGames.filter(mlbGame => 
          isCloseMatch(mlbGame.teams.away.team.name, game.awayTeamName) && 
          isCloseMatch(mlbGame.teams.home.team.name, game.homeTeamName)
        );

        if (closeMatches.length === 0) {
          console.log(`No close match found for ${game.id}`);
          continue;
        }

        const mlbGame = closeMatches[0];
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