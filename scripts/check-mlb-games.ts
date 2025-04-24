import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

async function checkMlbGames() {
  try {
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB'
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    console.log(`Found ${games.length} MLB games in database`);

    if (games.length > 0) {
      console.log('\nMost recent games:');
      games.slice(0, 5).forEach(game => {
        console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
        console.log(`Date: ${format(game.gameDate, 'MMM d, yyyy')}`);
        console.log(`ISO Date: ${game.gameDate.toISOString()}`);
        console.log(`Status: ${game.status}`);
        console.log(`Scores: ${game.awayScore ?? 'N/A'} - ${game.homeScore ?? 'N/A'}`);
        console.log(`Predictions: ${game.predictions.length}`);
        
        if (game.predictions.length > 0) {
          console.log('Prediction Details:');
          game.predictions.forEach(pred => {
            console.log(`  ${pred.predictionType}: Value=${pred.predictionValue}, Outcome=${pred.outcome}`);
          });
        }
      });

      console.log('\nOldest games:');
      games.slice(-5).forEach(game => {
        console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
        console.log(`Date: ${format(game.gameDate, 'MMM d, yyyy')}`);
        console.log(`ISO Date: ${game.gameDate.toISOString()}`);
        console.log(`Status: ${game.status}`);
        console.log(`Scores: ${game.awayScore ?? 'N/A'} - ${game.homeScore ?? 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkMlbGames(); 