import { PrismaClient, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGames() {
  try {
    const games = await prisma.game.findMany({
      where: {
        status: GameStatus.FINAL
      },
      take: 5
    });

    console.log(JSON.stringify(games, null, 2));
  } catch (error) {
    console.error('Error checking games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGames().catch(console.error); 