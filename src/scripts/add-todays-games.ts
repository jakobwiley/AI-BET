import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { OddsApiService } from '../lib/oddsApi.js';

const prisma = new PrismaClient();
const oddsApiService = new OddsApiService();

async function addTodaysGames() {
  console.log('Fetching today\'s games from Odds API...');
  
  try {
    // Get today's games from Odds API
    const games = await oddsApiService.getUpcomingGames('MLB');
    
    if (!games || games.length === 0) {
      console.log('No games found for today');
      return;
    }

    console.log(`Found ${games.length} games for today`);

    // Process each game
    for (const game of games) {
      // Check if game already exists
      const existingGame = await prisma.game.findFirst({
        where: {
          sport: 'MLB',
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: {
            gte: new Date(game.gameDate),
            lt: new Date(new Date(game.gameDate).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (existingGame) {
        console.log(`Game ${game.awayTeamName} @ ${game.homeTeamName} already exists in database`);
        continue;
      }

      // Create new game
      await prisma.game.create({
        data: {
          id: game.id,
          sport: 'MLB',
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: new Date(game.gameDate),
          startTime: game.startTime,
          status: game.status,
          oddsJson: game.odds
        }
      });

      console.log(`Added game: ${game.awayTeamName} @ ${game.homeTeamName}`);
    }

    console.log('Successfully processed today\'s games');
  } catch (error) {
    console.error('Error adding games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTodaysGames().catch(console.error); 