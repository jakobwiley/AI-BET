import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    // Delete all predictions first (due to foreign key constraints)
    await prisma.prediction.deleteMany();
    console.log('Cleared all predictions');

    // Then delete all games
    await prisma.game.deleteMany();
    console.log('Cleared all games');

  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase().catch(console.error); 