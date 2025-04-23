import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPredictions() {
  try {
    // Get predictions for games on April 23-24, 2025
    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          gameDate: {
            gte: new Date('2025-04-23T00:00:00Z'),
            lte: new Date('2025-04-24T23:59:59Z')
          }
        }
      },
      include: {
        game: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${predictions.length} predictions for April 23-24, 2025`);
    
    predictions.forEach(pred => {
      console.log('\n-----------------------------------');
      console.log(`Game: ${pred.game.homeTeamName} vs ${pred.game.awayTeamName}`);
      console.log(`Type: ${pred.predictionType}`);
      console.log(`Value: ${pred.predictionValue}`);
      console.log(`Confidence: ${pred.confidence * 100}%`);
      console.log(`Reasoning: ${pred.reasoning}`);
      console.log('-----------------------------------');
    });

  } catch (error) {
    console.error('Error checking predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPredictions().catch(console.error); 