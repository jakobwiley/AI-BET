const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Fetch NBA games for today
    const nbaGames = await prisma.game.findMany({
      where: {
        sport: 'NBA',
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        predictions: true
      }
    });
    
    // Fetch MLB games for today
    const mlbGames = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        predictions: true
      }
    });
    
    console.log('NBA Games:');
    console.log(JSON.stringify(nbaGames, null, 2));
    
    console.log('\nMLB Games:');
    console.log(JSON.stringify(mlbGames, null, 2));
  } catch (error) {
    console.error('Error fetching games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 