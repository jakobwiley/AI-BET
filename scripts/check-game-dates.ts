import { PrismaClient, GameStatus } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function checkGameDates() {
  try {
    console.log('Checking game dates in the database...');
    
    // Get all games
    const allGames = await prisma.game.findMany({
      orderBy: {
        gameDate: 'asc'
      }
    });
    
    console.log(`Total games in database: ${allGames.length}`);
    
    // Get current date
    const now = new Date();
    console.log(`Current date: ${now.toISOString()}`);
    
    // Count games by status
    const gamesByStatus = allGames.reduce((acc, game) => {
      acc[game.status] = (acc[game.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Games by status:');
    Object.entries(gamesByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Count past games
    const pastGames = allGames.filter(game => game.gameDate < now);
    console.log(`Past games: ${pastGames.length}`);
    
    // Count future games
    const futureGames = allGames.filter(game => game.gameDate > now);
    console.log(`Future games: ${futureGames.length}`);
    
    // Count today's games
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayGames = allGames.filter(game => 
      game.gameDate >= today && game.gameDate < tomorrow
    );
    console.log(`Today's games: ${todayGames.length}`);
    
    // Show some examples of past games
    if (pastGames.length > 0) {
      console.log('\nExample past games:');
      pastGames.slice(0, 5).forEach(game => {
        console.log(`  ${game.homeTeamName} vs ${game.awayTeamName} (${game.gameDate.toISOString()}) - Status: ${game.status}`);
      });
    }
    
    // Show some examples of future games
    if (futureGames.length > 0) {
      console.log('\nExample future games:');
      futureGames.slice(0, 5).forEach(game => {
        console.log(`  ${game.homeTeamName} vs ${game.awayTeamName} (${game.gameDate.toISOString()}) - Status: ${game.status}`);
      });
    }
    
    // Check for games with FINAL status
    const finalGames = allGames.filter(game => game.status === GameStatus.FINAL);
    console.log(`\nGames with FINAL status: ${finalGames.length}`);
    
    if (finalGames.length > 0) {
      console.log('Example FINAL games:');
      finalGames.slice(0, 5).forEach(game => {
        console.log(`  ${game.homeTeamName} vs ${game.awayTeamName} (${game.gameDate.toISOString()})`);
      });
    }
    
    // Check for games with pending predictions
    const gamesWithPendingPredictions = await prisma.game.findMany({
      where: {
        predictions: {
          some: {
            outcome: 'PENDING'
          }
        }
      }
    });
    
    console.log(`\nGames with pending predictions: ${gamesWithPendingPredictions.length}`);
    
    if (gamesWithPendingPredictions.length > 0) {
      console.log('Example games with pending predictions:');
      gamesWithPendingPredictions.slice(0, 5).forEach(game => {
        console.log(`  ${game.homeTeamName} vs ${game.awayTeamName} (${game.gameDate.toISOString()}) - Status: ${game.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking game dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkGameDates(); 