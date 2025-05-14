import { PrismaClient, PredictionType } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupPredictions() {
  const games = await prisma.game.findMany({
    include: {
      predictions: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  console.log(`Processing ${games.length} games...`);
  let totalDeleted = 0;
  let gamesFixed = 0;

  for (const game of games) {
    const keepPredictions = new Map<PredictionType, string>();
    const deletePredictions: string[] = [];

    // Keep only the most recent prediction of each type
    for (const prediction of game.predictions) {
      if (!keepPredictions.has(prediction.predictionType)) {
        keepPredictions.set(prediction.predictionType, prediction.id);
      } else {
        deletePredictions.push(prediction.id);
      }
    }

    if (deletePredictions.length > 0) {
      // Delete duplicate predictions
      await prisma.prediction.deleteMany({
        where: {
          id: {
            in: deletePredictions
          }
        }
      });
      totalDeleted += deletePredictions.length;
      gamesFixed++;

      console.log(`Game ${game.id} (${game.homeTeamName} vs ${game.awayTeamName}):`);
      console.log(`- Deleted ${deletePredictions.length} duplicate predictions`);
      console.log(`- Kept ${keepPredictions.size} predictions\n`);
    }
  }

  console.log('\nCleanup Summary:');
  console.log(`Total games processed: ${games.length}`);
  console.log(`Games with duplicates fixed: ${gamesFixed}`);
  console.log(`Total duplicate predictions deleted: ${totalDeleted}`);
}

cleanupPredictions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 