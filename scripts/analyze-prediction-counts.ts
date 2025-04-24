import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePredictions() {
  const games = await prisma.game.findMany({
    include: {
      predictions: {
        select: {
          id: true,
          predictionType: true,
          gameId: true,
          createdAt: true
        }
      }
    }
  });

  console.log(`Total games: ${games.length}`);
  
  // Count predictions per game
  const gamesPredictions = games.map(game => ({
    gameId: game.id,
    teams: `${game.homeTeamName} vs ${game.awayTeamName}`,
    predictionCount: game.predictions.length,
    typeBreakdown: game.predictions.reduce((acc, pred) => {
      acc[pred.predictionType] = (acc[pred.predictionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  }));

  // Find games with more than 3 predictions
  const gamesWithExcess = gamesPredictions.filter(g => g.predictionCount > 3);
  
  console.log('\nGames with more than 3 predictions:');
  gamesWithExcess.forEach(g => {
    console.log(`\nGame: ${g.teams}`);
    console.log(`Total predictions: ${g.predictionCount}`);
    console.log('Type breakdown:', g.typeBreakdown);
  });

  // Summary statistics
  const totalPredictions = gamesPredictions.reduce((sum, g) => sum + g.predictionCount, 0);
  const gamesWithLessThan3 = gamesPredictions.filter(g => g.predictionCount < 3).length;
  const gamesWithExactly3 = gamesPredictions.filter(g => g.predictionCount === 3).length;
  const gamesWithMore = gamesWithExcess.length;

  console.log('\nSummary:');
  console.log(`Total predictions across all games: ${totalPredictions}`);
  console.log(`Games with less than 3 predictions: ${gamesWithLessThan3}`);
  console.log(`Games with exactly 3 predictions: ${gamesWithExactly3}`);
  console.log(`Games with more than 3 predictions: ${gamesWithMore}`);
}

analyzePredictions()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 