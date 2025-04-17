import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPredictions() {
  try {
    const predictions = await prisma.prediction.findMany({
      where: {
        confidence: {
          gte: 0.75
        }
      },
      include: {
        game: true
      },
      take: 5
    });

    console.log(JSON.stringify(predictions, null, 2));
  } catch (error) {
    console.error('Error checking predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPredictions().catch(console.error); 