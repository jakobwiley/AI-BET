import { PrismaClient } from '@prisma/client';

async function checkGameStatus() {
  const prisma = new PrismaClient();
  
  try {
    // Get all FINAL games with their predictions
    const finalGames = await prisma.game.findMany({
      where: { status: 'FINAL' },
      include: { predictions: true }
    });

    console.log(`Found ${finalGames.length} games with FINAL status`);

    // Count predictions by outcome
    const predictionStats = finalGames.reduce((acc, game) => {
      game.predictions.forEach(pred => {
        acc[pred.outcome] = (acc[pred.outcome] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    console.log('\nPrediction outcomes:');
    Object.entries(predictionStats).forEach(([outcome, count]) => {
      console.log(`${outcome}: ${count}`);
    });

  } catch (error) {
    console.error('Error checking game status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGameStatus().catch(console.error); 