import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfidence() {
  try {
    const predictions = await prisma.prediction.findMany({
      take: 10,
      select: {
        id: true,
        predictionType: true,
        confidence: true,
        game: {
          select: {
            homeTeamName: true,
            awayTeamName: true
          }
        }
      }
    });

    console.log('Sample predictions with confidence values:');
    predictions.forEach(pred => {
      console.log(`\nGame: ${pred.game.awayTeamName} vs ${pred.game.homeTeamName}`);
      console.log(`Type: ${pred.predictionType}`);
      console.log(`Confidence: ${pred.confidence}`);
    });

  } catch (error) {
    console.error('Error checking confidence:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfidence().catch(console.error); 