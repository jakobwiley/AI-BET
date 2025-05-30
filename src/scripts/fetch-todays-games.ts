import { PrismaClient, SportType, Prisma } from '@prisma/client';
import { OddsApiService } from '../lib/oddsApi.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fetchTodaysGames() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('🔄 Fetching MLB games for', today.toLocaleDateString());

    const oddsService = new OddsApiService();
    const games = await oddsService.getUpcomingGames(SportType.MLB);

    console.log(`Found ${games.length} games for today`);

    // Store games in database
    for (const game of games) {
      const existingGame = await prisma.game.findFirst({
        where: {
          sport: game.sport,
          gameDate: game.gameDate,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName
        }
      });

      // Convert game data to Prisma-compatible format
      let oddsObj = {};
      if (game.odds && typeof game.odds === 'object' && !Array.isArray(game.odds)) {
        oddsObj = game.odds;
      }
      const gameData = {
        id: game.id,
        sport: game.sport,
        gameDate: new Date(game.gameDate),
        homeTeamName: game.homeTeamName,
        awayTeamName: game.awayTeamName,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        status: game.status,
        startTime: game.startTime,
        oddsJson: {
          ...oddsObj,
          // Advanced GameInfo fields (placeholders for now)
          gameInfo: {
            location: '',
            weatherConditions: null,
            umpireAssignments: [],
            injuries: [],
            suspensions: [],
            restDaysHome: null,
            restDaysAway: null
          }
        }
      };

      if (!existingGame) {
        await prisma.game.create({
          data: gameData
        });
        console.log(`Added new game: ${game.homeTeamName} vs ${game.awayTeamName}`);
      } else {
        await prisma.game.update({
          where: { id: existingGame.id },
          data: {
            status: game.status,
            oddsJson: gameData.oddsJson
          }
        });
        console.log(`Updated existing game: ${game.homeTeamName} vs ${game.awayTeamName}`);
      }
    }

    console.log('\nGames fetched and stored successfully');

  } catch (error) {
    console.error('Error fetching today\'s games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchTodaysGames().catch(console.error); 