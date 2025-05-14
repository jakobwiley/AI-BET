import { PrismaClient, GameStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkSingleGame() {
  try {
    const game = await prisma.game.findFirst({
      where: {
        gameDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        },
        status: GameStatus.SCHEDULED
      }
    });

    if (!game) {
      console.log('No games found for today');
      return;
    }

    console.log('Game:', {
      id: game.id,
      homeTeam: game.homeTeamName,
      awayTeam: game.awayTeamName,
      oddsJson: game.oddsJson
    });

  } catch (error) {
    console.error('Error checking game:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSingleGame(); 