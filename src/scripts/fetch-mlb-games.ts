import { PrismaClient, SportType, GameStatus } from '@prisma/client';
import axios from 'axios';
import { format, addDays } from 'date-fns';

const prisma = new PrismaClient();
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';

interface MLBGame {
  gamePk: number;
  teams: {
    home: { team: { name: string } };
    away: { team: { name: string } };
  };
  gameDate: string;
  status: {
    statusCode: string;
    detailedState: string;
  };
  linescore?: {
    teams: {
      home: { runs: number };
      away: { runs: number };
    };
  };
}

interface MLBScheduleResponse {
  dates: Array<{
    date: string;
    games: MLBGame[];
  }>;
}

async function fetchMLBGames() {
  try {
    console.log('🔄 Starting MLB game fetching process...');

    // Get today's date and format it for the API
    const today = new Date();
    const dateStr = format(today, 'MM/dd/yyyy');

    // Fetch games from MLB API
    const response = await axios.get<MLBScheduleResponse>(`${MLB_API_BASE_URL}/schedule`, {
      params: {
        sportId: 1,
        date: dateStr,
        fields: 'dates,games,gamePk,teams,home,away,team,name,gameDate,status,linescore'
      }
    });

    const games = response.data.dates[0]?.games || [];
    console.log(`Found ${games.length} MLB games for ${dateStr}`);

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each game
    for (const game of games) {
      try {
        const homeTeamName = game.teams.home.team.name;
        const awayTeamName = game.teams.away.team.name;
        const gameDate = new Date(game.gameDate);
        const gameId = `MLB_${awayTeamName}_${homeTeamName}_${format(gameDate, 'yyyy-MM-dd')}`;

        // Map game status
        let status = GameStatus.SCHEDULED;
        if (game.status.statusCode === 'F') {
          status = GameStatus.FINAL;
        } else if (game.status.statusCode === 'I' || game.status.statusCode === 'D') {
          status = GameStatus.IN_PROGRESS;
        } else if (game.status.statusCode === 'P') {
          status = GameStatus.POSTPONED;
        } else if (game.status.statusCode === 'C') {
          status = GameStatus.CANCELLED;
        }

        // Get scores if available
        const homeScore = game.linescore?.teams.home.runs;
        const awayScore = game.linescore?.teams.away.runs;

        // Create or update game
        const existingGame = await prisma.game.findUnique({
          where: { id: gameId }
        });

        if (existingGame) {
          await prisma.game.update({
            where: { id: gameId },
            data: {
              status,
              homeScore,
              awayScore,
              mlbGameId: game.gamePk.toString()
            }
          });
          updatedCount++;
        } else {
          await prisma.game.create({
            data: {
              id: gameId,
              sport: SportType.MLB,
              homeTeamId: homeTeamName,
              awayTeamId: awayTeamName,
              homeTeamName,
              awayTeamName,
              gameDate,
              status,
              homeScore,
              awayScore,
              mlbGameId: game.gamePk.toString()
            }
          });
          createdCount++;
        }
      } catch (error) {
        console.error(`Error processing game:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Game Fetching Summary ===');
    console.log(`Total games processed: ${games.length}`);
    console.log(`New games created: ${createdCount}`);
    console.log(`Existing games updated: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error in fetchMLBGames:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fetching process
fetchMLBGames().catch(console.error); 