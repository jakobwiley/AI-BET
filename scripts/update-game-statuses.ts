import { PrismaClient, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function updateGameStatuses() {
  try {
    console.log('🔄 Starting game status update process...');
    
    // Get all scheduled games
    const scheduledGames = await prisma.game.findMany({
      where: {
        status: GameStatus.SCHEDULED
      }
    });
    
    console.log(`Found ${scheduledGames.length} scheduled games`);
    
    const now = new Date();
    let updatedCount = 0;
    
    for (const game of scheduledGames) {
      const gameTime = new Date(game.gameDate);
      
      // If game time is in the past, mark as FINAL
      if (gameTime < now) {
        await prisma.game.update({
          where: { id: game.id },
          data: { status: GameStatus.FINAL }
        });
        console.log(`Updated game ${game.id} (${game.homeTeamName} vs ${game.awayTeamName}) to FINAL`);
        updatedCount++;
      }
      // If game is within 3 hours, mark as IN_PROGRESS
      else if (Math.abs(gameTime.getTime() - now.getTime()) < 3 * 60 * 60 * 1000) {
        await prisma.game.update({
          where: { id: game.id },
          data: { status: GameStatus.IN_PROGRESS }
        });
        console.log(`Updated game ${game.id} (${game.homeTeamName} vs ${game.awayTeamName}) to IN_PROGRESS`);
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} game statuses`);
    
  } catch (error) {
    console.error('Error updating game statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateGameStatuses(); 