import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

async function checkGamePredictions() {
  try {
    // Get games with predictions
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        OR: [
          {
            homeTeamName: 'Houston Astros',
            awayTeamName: 'San Diego Padres'
          },
          {
            homeTeamName: 'Colorado Rockies',
            awayTeamName: 'Washington Nationals'
          }
        ]
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${games.length} games to check`);

    for (const game of games) {
      console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Date: ${format(game.gameDate, 'MMM d, yyyy HH:mm:ss')}`);
      console.log(`Status: ${game.status}`);
      console.log(`Scores: ${game.awayScore ?? 'N/A'} - ${game.homeScore ?? 'N/A'}`);
      console.log(`Number of predictions: ${game.predictions.length}`);

      if (game.predictions.length > 0) {
        console.log('\nPredictions:');
        game.predictions.forEach(pred => {
          console.log(`- ${pred.predictionType}:`);
          console.log(`  Value: ${pred.predictionValue}`);
          console.log(`  Confidence: ${pred.confidence}`);
          console.log(`  Outcome: ${pred.outcome}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkGamePredictions(); 