import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getGames() {
  try {
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        predictions: true
      }
    });

    console.log('Today\'s Games:');
    games.forEach(game => {
      const odds = game.oddsJson ? JSON.parse(game.oddsJson) : {};
      console.log(`\n${game.homeTeamName} vs ${game.awayTeamName}`);
      console.log(`Status: ${game.status}`);
      if (odds.spread) {
        console.log(`Spread: ${odds.spread}`);
      }
      if (odds.total) {
        console.log(`Total: ${odds.total}`);
      }
      if (odds.moneyline) {
        console.log(`Moneyline: Home ${odds.moneyline.home}, Away ${odds.moneyline.away}`);
      }
      console.log('Predictions:');
      game.predictions.forEach(pred => {
        console.log(`- Type: ${pred.predictionType}`);
        console.log(`  Confidence: ${pred.confidence}`);
        console.log(`  Outcome: ${pred.outcome}`);
      });
    });
  } catch (error) {
    console.error('Error fetching games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getGames(); 