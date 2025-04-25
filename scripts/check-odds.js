import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function checkOdds() {
  try {
    const today = new Date('2025-04-24T00:00:00.000Z');
    const tomorrow = new Date('2025-04-25T00:00:00.000Z');

    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: tomorrow
        },
        predictions: {
          some: {}
        }
      },
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        oddsJson: true,
        predictions: {
          select: {
            predictionType: true,
            predictionValue: true
          }
        }
      }
    });

    console.log(`Found ${games.length} games for April 24, 2025`);
    games.forEach(game => {
      console.log('\nGame:', game.awayTeamName, '@', game.homeTeamName);
      console.log('oddsJson:', game.oddsJson);
      console.log('Predictions:', game.predictions);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOdds(); 