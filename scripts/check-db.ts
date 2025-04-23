import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const game = await prisma.game.findFirst({
      include: {
        predictions: true
      }
    });
    
    if (!game) {
      console.log('No games found in database');
      return;
    }
    
    console.log('Game:', {
      id: game.id,
      teams: `${game.awayTeamName} @ ${game.homeTeamName}`,
      odds: game.oddsJson,
      predictions: game.predictions
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 