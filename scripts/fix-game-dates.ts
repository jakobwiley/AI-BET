import { PrismaClient, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGameDates() {
  try {
    // Find all games from 2024
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31')
        }
      }
    });

    console.log(`Found ${games.length} games from 2024 to update\n`);

    let gamesUpdated = 0;

    for (const game of games) {
      const oldDate = game.gameDate;
      const newDate = new Date(oldDate);
      newDate.setFullYear(2025);

      // Update the game with new date and status
      await prisma.game.update({
        where: { id: game.id },
        data: {
          gameDate: newDate,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null
        }
      });

      console.log(`Updated game: ${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`- Old date: ${oldDate.toISOString().split('T')[0]}`);
      console.log(`- New date: ${newDate.toISOString().split('T')[0]}`);
      console.log('-------------------');

      gamesUpdated++;
    }

    console.log('\nSummary:');
    console.log(`Games updated: ${gamesUpdated}`);

  } catch (error) {
    console.error('Error fixing game dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGameDates()
  .catch(console.error); 