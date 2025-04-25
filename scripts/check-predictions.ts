import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function checkPredictions() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  const predictions = await prisma.prediction.findMany({
    where: {
      game: {
        gameDate: {
          gte: yesterday,
          lt: today
        }
      }
    },
    include: {
      game: true
    }
  });

  console.log('\nPREDICTION VALUES CHECK\n');
  console.log(`Found ${predictions.length} predictions for ${yesterday.toLocaleDateString()}\n`);

  predictions.forEach(pred => {
    console.log(`Type: ${pred.predictionType}`);
    console.log(`Value: ${pred.predictionValue}`);
    console.log(`Outcome: ${pred.outcome}`);
    console.log(`Game: ${pred.game.homeTeamName} vs ${pred.game.awayTeamName}\n`);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkPredictions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
} 