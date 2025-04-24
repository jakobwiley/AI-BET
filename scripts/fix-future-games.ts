import { PrismaClient, GameStatus, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFutureGames() {
  try {
    const now = new Date();
    
    // Find all games in the future
    const futureGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gt: now
        }
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${futureGames.length} future games to fix`);

    let gamesFixed = 0;
    let predictionsReset = 0;

    for (const game of futureGames) {
      // Update game status and clear scores
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null
        }
      });

      // Reset predictions to PENDING
      if (game.predictions.length > 0) {
        await prisma.prediction.updateMany({
          where: {
            gameId: game.id,
            outcome: {
              not: PredictionOutcome.PENDING
            }
          },
          data: {
            outcome: PredictionOutcome.PENDING
          }
        });
        predictionsReset += game.predictions.length;
      }

      console.log(`Fixed game: ${game.awayTeamName} @ ${game.homeTeamName} on ${game.gameDate.toISOString().split('T')[0]}`);
      gamesFixed++;
    }

    console.log('\nSummary:');
    console.log(`Games fixed: ${gamesFixed}`);
    console.log(`Predictions reset: ${predictionsReset}`);

  } catch (error) {
    console.error('Error fixing future games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFutureGames()
  .catch(console.error); 