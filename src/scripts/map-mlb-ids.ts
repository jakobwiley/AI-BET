import { PrismaClient, SportType } from '@prisma/client';
import axios from 'axios';
import { format, subDays } from 'date-fns';

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

async function mapMLBGameIds() {
  try {
    console.log('🔄 Starting MLB game ID mapping process...');

    // Get all MLB games from the last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    console.log(`Found ${games.length} MLB games to process`);

    // Process in batches
    const batchSize = 5;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(games.length / batchSize)}`);

      for (const game of batch) {
        try {
          console.log(`\nProcessing: ${game.awayTeamName} @ ${game.homeTeamName}`);
          console.log(`Date: ${format(game.gameDate, 'MMM d, yyyy')}`);

          // Fetch games from MLB API for this date
          const dateStr = format(game.gameDate, 'MM/dd/yyyy');
          const response = await axios.get<MLBScheduleResponse>(`${MLB_API_BASE_URL}/schedule`, {
            params: {
              sportId: 1,
              date: dateStr,
              fields: 'dates,games,gamePk,teams,home,away,team,name,gameDate'
            }
          });

          const mlbGames = response.data.dates[0]?.games || [];
          
          // Find matching game
          const matchingGame = mlbGames.find((g: MLBGame) => 
            g.teams.home.team.name === game.homeTeamName &&
            g.teams.away.team.name === game.awayTeamName
          );

          if (matchingGame) {
            // Update game with MLB gamePk
            await prisma.game.update({
              where: { id: game.id },
              data: {
                mlbGameId: matchingGame.gamePk.toString()
              }
            });
            console.log(`✅ Mapped to MLB gamePk: ${matchingGame.gamePk}`);
            updatedCount++;
          } else {
            console.log('❌ No matching MLB game found');
            errorCount++;
          }

          // Add delay between API calls
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n=== Mapping Summary ===');
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully mapped: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error in mapMlbIds:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

// Run the mapping process