import { PrismaClient, SportType } from '@prisma/client';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { teamNameMapping } from './team-name-mapping.js';

const prisma = new PrismaClient();
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';

interface MLBGame {
  gamePk: number;
  teams: {
    home: { team: { name: string } };
    away: { team: { name: string } };
  };
  gameDate: string;
}

interface MLBScheduleResponse {
  dates: Array<{
    date: string;
    games: MLBGame[];
  }>;
}

async function cleanupMLBGames() {
  try {
    console.log('🔄 Starting MLB games cleanup process...');

    // Get today's date and 30 days ago
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    console.log(`Processing games from ${format(thirtyDaysAgo, 'MMM d, yyyy')} to ${format(today, 'MMM d, yyyy')}`);

    // Get all MLB games from the last 30 days
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: thirtyDaysAgo,
          lte: today
        }
      } as any,
      orderBy: {
        gameDate: 'desc'
      }
    }) as any[];

    console.log(`Found ${games.length} MLB games to process`);

    let deletedCount = 0;
    let mappedCount = 0;
    let errorCount = 0;
    let predictionsDeletedCount = 0;

    // Process games by date
    const gamesByDate = games.reduce((acc, game) => {
      const dateStr = format(game.gameDate, 'MM/dd/yyyy');
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(game);
      return acc;
    }, {} as Record<string, any[]>);

    // Process each date
    for (const [dateStr, dateGames] of Object.entries(gamesByDate)) {
      console.log(`\nProcessing date: ${dateStr}`);
      
      // Fetch MLB API games for this date
      const response = await axios.get<MLBScheduleResponse>(`${MLB_API_BASE_URL}/schedule`, {
        params: {
          sportId: 1,
          date: dateStr,
          fields: 'dates,games,gamePk,teams,home,away,team,name,gameDate'
        }
      });

      const mlbGames = response.data.dates[0]?.games || [];
      
      if (mlbGames.length === 0) {
        console.log(`No real MLB games found for ${dateStr} - deleting all games for this date`);
        // Delete all games for this date as they are not real
        for (const game of dateGames) {
          try {
            // First delete any predictions associated with this game
            await prisma.prediction.deleteMany({
              where: { gameId: game.id }
            });
            predictionsDeletedCount++;

            // Then delete the game
            await prisma.game.delete({
              where: { id: game.id }
            });
            deletedCount++;
          } catch (error) {
            console.error(`Error processing game ${game.id}:`, error);
            errorCount++;
          }
        }
        continue;
      }

      // Process each game in our database
      for (const game of dateGames) {
        try {
          // Map team names to MLB API format
          const mappedHomeTeam = teamNameMapping[game.homeTeamName] || game.homeTeamName;
          const mappedAwayTeam = teamNameMapping[game.awayTeamName] || game.awayTeamName;

          // Find matching game in MLB API
          const matchingGame = mlbGames.find((g: MLBGame) => 
            g.teams.home.team.name === mappedHomeTeam &&
            g.teams.away.team.name === mappedAwayTeam
          );

          if (matchingGame) {
            // Update game with MLB gamePk
            await prisma.game.update({
              where: { id: game.id },
              data: {
                mlbGameId: matchingGame.gamePk.toString()
              } as any
            });
            console.log(`✅ Mapped: ${mappedAwayTeam} @ ${mappedHomeTeam}`);
            mappedCount++;
          } else {
            // First delete any predictions associated with this game
            await prisma.prediction.deleteMany({
              where: { gameId: game.id }
            });
            predictionsDeletedCount++;

            // Then delete the game as it's not a real MLB game
            await prisma.game.delete({
              where: { id: game.id }
            });
            console.log(`❌ Deleted: ${mappedAwayTeam} @ ${mappedHomeTeam} (not a real game)`);
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n=== Cleanup Summary ===');
    console.log(`Date range: ${format(thirtyDaysAgo, 'MMM d, yyyy')} to ${format(today, 'MMM d, yyyy')}`);
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully mapped: ${mappedCount}`);
    console.log(`Deleted (fake/test games): ${deletedCount}`);
    console.log(`Predictions deleted: ${predictionsDeletedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error in cleanup process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupMLBGames(); 