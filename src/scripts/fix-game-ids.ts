import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGameIds() {
  try {
    // Get all games with non-standard IDs
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        NOT: {
          id: {
            startsWith: 'mlb-game-'
          }
        }
      }
    });

    console.log(`Found ${games.length} MLB games with non-standard IDs`);

    for (const game of games) {
      // Extract numeric ID if it exists in the current ID
      const numericId = game.id.match(/\d+/);
      if (numericId) {
        const newId = `mlb-game-${numericId[0]}`;
        try {
          await prisma.game.update({
            where: { id: game.id },
            data: { id: newId }
          });
          console.log(`Updated game ID from ${game.id} to ${newId}`);
        } catch (error) {
          console.error(`Error updating game ${game.id}:`, error);
        }
      } else {
        console.log(`Could not extract numeric ID from ${game.id}, skipping...`);
      }
    }

    console.log('Finished fixing game IDs');
  } catch (error) {
    console.error('Error fixing game IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGameIds(); 