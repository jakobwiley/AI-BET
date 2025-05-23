import { PrismaClient, SportType, GameStatus } from '@prisma/client';
import { subDays } from 'date-fns';
import axios from 'axios';
import { TEAM_ID_TO_ABBR } from './team-id-mapping.ts';

const prisma = new PrismaClient();

interface MLBGame {
  teams: {
    away: {
      team: {
        id: number;
      };
      score: number;
    };
    home: {
      team: {
        id: number;
      };
      score: number;
    };
  };
  status: {
    statusCode: string;
  };
}

interface MLBResponse {
  dates: Array<{
    games: MLBGame[];
  }>;
}

// MLB team ID mapping
const MLB_TEAM_IDS: { [key: string]: number } = {
  'ARI': 109,
  'ATL': 144,
  'BAL': 110,
  'BOS': 111,
  'CHC': 112,
  'CHW': 145,
  'CIN': 113,
  'CLE': 114,
  'COL': 115,
  'DET': 116,
  'HOU': 117,
  'KC': 118,
  'LAA': 108,
  'LAD': 119,
  'MIA': 146,
  'MIL': 158,
  'MIN': 142,
  'NYM': 121,
  'NYY': 147,
  'OAK': 133,
  'PHI': 143,
  'PIT': 134,
  'SD': 135,
  'SEA': 136,
  'SF': 137,
  'STL': 138,
  'TB': 139,
  'TEX': 140,
  'TOR': 141,
  'WSH': 120
};

function normalizeToAbbr(teamId: string): string | undefined {
  return TEAM_ID_TO_ABBR[teamId];
}

async function fetchMissingScores() {
  try {
    console.log('🔍 Fetching missing scores for MLB games...');

    const thirtyDaysAgo = subDays(new Date(), 30);

    // Get all MLB games from the last 30 days with missing scores
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: thirtyDaysAgo,
          lt: new Date() // Only get games up to now
        },
        OR: [
          { homeScore: null },
          { awayScore: null }
        ]
      }
    });

    console.log(`Found ${games.length} games with missing scores`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const game of games) {
      try {
        // Format the date for the API
        const gameDate = new Date(game.gameDate);
        const dateStr = gameDate.toISOString().split('T')[0];

        // Normalize to MLB abbreviation
        const homeAbbr = normalizeToAbbr(game.homeTeamId);
        const awayAbbr = normalizeToAbbr(game.awayTeamId);
        const homeTeamId = homeAbbr ? MLB_TEAM_IDS[homeAbbr] : undefined;
        const awayTeamId = awayAbbr ? MLB_TEAM_IDS[awayAbbr] : undefined;

        if (!homeTeamId || !awayTeamId) {
          console.error(`Invalid team ID for game ${game.id}: ${game.homeTeamId} vs ${game.awayTeamId}`);
          continue;
        }

        // Make API call to get game data
        const response = await axios.get<MLBResponse>(`https://statsapi.mlb.com/api/v1/schedule`, {
          params: {
            sportId: 1, // MLB
            date: dateStr,
            teamId: homeTeamId // We'll get all games for the home team on that date
          }
        });

        const games = response.data.dates[0]?.games || [];
        const gameData = games.find((g) => 
          g.teams.away.team.id === awayTeamId && 
          g.teams.home.team.id === homeTeamId
        );

        if (gameData && gameData.status.statusCode === 'F') {
          // Update game with scores
          await prisma.game.update({
            where: { id: game.id },
            data: {
              homeScore: gameData.teams.home.score,
              awayScore: gameData.teams.away.score,
              status: GameStatus.FINAL
            }
          });

          console.log(`Updated scores for ${game.awayTeamName} @ ${game.homeTeamName}: ${gameData.teams.away.score}-${gameData.teams.home.score}`);
          updatedCount++;
        } else {
          console.log(`No final score found for ${game.awayTeamName} @ ${game.homeTeamName}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error fetching score for game ${game.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error fetching scores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchMissingScores(); 