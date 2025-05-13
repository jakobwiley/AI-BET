import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

async function checkPredictions() {
  // Set date to April 25, 2025
  const targetDate = new Date('2025-04-25T00:00:00');
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(targetDate.getDate() + 1);

  const predictions = await prisma.prediction.findMany({
    where: {
      game: {
        gameDate: {
          gte: targetDate,
          lt: nextDay
        }
      }
    },
    include: {
      game: true
    }
  });

  console.log('\nPREDICTION VALUES CHECK\n');
  console.log(`Found ${predictions.length} predictions for ${targetDate.toLocaleDateString()}\n`);

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