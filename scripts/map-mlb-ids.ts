import { PrismaClient, SportType } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';

interface Team {
  team: {
    id: number;
    name: string;
  };
}

interface Game {
  gamePk: number;
  gameDate: string;
  teams: {
    away: Team;
    home: Team;
  };
}

interface MLBScheduleResponse {
  dates: Array<{
    date: string;
    games: Game[];
  }>;
}

async function mapMlbIds() {
  try {
    console.log('🔄 Starting MLB game ID mapping process...');

    // Get all MLB games from our database
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        status: 'FINAL',
        OR: [
          { homeScore: null },
          { awayScore: null }
        ]
      }
    });

    console.log(`Found ${games.length} MLB games to map`);

    // For each game, try to find its MLB Stats API ID
    for (const game of games) {
      try {
        const gameDate = new Date(game.gameDate);
        const formattedDate = gameDate.toISOString().split('T')[0];
        
        console.log(`\nProcessing game: ${game.awayTeamName} @ ${game.homeTeamName} on ${formattedDate}`);

        // Search for the game in MLB Stats API by date and teams
        const response = await axios.get<MLBScheduleResponse>(
          `${MLB_API_BASE_URL}/schedule?sportId=1&date=${formattedDate}&hydrate=team`
        );

        console.log('API Response:', JSON.stringify(response.data, null, 2));

        if (!response.data.dates || response.data.dates.length === 0) {
          console.log(`No games found for date ${formattedDate}`);
          continue;
        }

        const gamesForDate = response.data.dates[0].games;
        console.log(`Found ${gamesForDate.length} MLB games for ${formattedDate}`);

        const matchingGame = gamesForDate.find(g => {
          const homeTeamMatches = g.teams.home.team.name.includes(game.homeTeamName) || 
                                game.homeTeamName.includes(g.teams.home.team.name);
          const awayTeamMatches = g.teams.away.team.name.includes(game.awayTeamName) || 
                                game.awayTeamName.includes(g.teams.away.team.name);
          
          if (homeTeamMatches && awayTeamMatches) {
            console.log(`Found match: ${g.teams.away.team.name} @ ${g.teams.home.team.name} (ID: ${g.gamePk})`);
            return true;
          }
          return false;
        });

        if (matchingGame) {
          // Update our game ID to include the MLB Stats API ID
          await prisma.game.update({
            where: { id: game.id },
            data: {
              id: `mlb-game-${matchingGame.gamePk}`
            }
          });
          console.log(`✅ Mapped ${game.homeTeamName} vs ${game.awayTeamName} to MLB game ID: ${matchingGame.gamePk}`);
        } else {
          console.log(`❌ Could not find MLB game ID for ${game.homeTeamName} vs ${game.awayTeamName} on ${formattedDate}`);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error mapping game ${game.id}:`, error instanceof Error ? error.message : String(error));
      }
    }

  } catch (error) {
    console.error('Error in mapMlbIds:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

// Run the mapping process
mapMlbIds(); 