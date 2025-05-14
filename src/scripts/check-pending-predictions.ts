import { PrismaClient, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPendingPredictions() {
  try {
    // Find games that have scores but still have pending predictions
    const gamesWithPendingPredictions = await prisma.game.findMany({
      where: {
        AND: [
          {
            homeScore: { not: null },
            awayScore: { not: null },
          },
          {
            predictions: {
              some: {
                outcome: 'PENDING'
              }
            }
          }
        ]
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${gamesWithPendingPredictions.length} games with scores but pending predictions\n`);

    for (const game of gamesWithPendingPredictions) {
      console.log(`Game: ${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Date: ${game.gameDate}`);
      console.log(`Score: ${game.awayScore}-${game.homeScore}`);
      console.log(`Status: ${game.status}`);
      console.log('Pending Predictions:');
      
      game.predictions
        .filter(p => p.outcome === 'PENDING')
        .forEach(pred => {
          console.log(`- Type: ${pred.predictionType}, Value: ${pred.predictionValue}`);
        });
      console.log('-------------------\n');
    }

  } catch (error) {
    console.error('Error checking pending predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingPredictions().catch(console.error); 