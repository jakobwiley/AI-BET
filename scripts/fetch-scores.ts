import { PrismaClient, Game, GameStatus, SportType } from '@prisma/client';
import * as axios from 'axios';

const prisma = new PrismaClient();

const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';
const NBA_API_BASE_URL = 'https://stats.nba.com/stats/boxscoresummaryv2';

interface MLBApiResponse {
  teams: {
    home: {
      teamStats: {
        batting: {
          runs: number;
        };
      };
    };
    away: {
      teamStats: {
        batting: {
          runs: number;
        };
      };
    };
  };
}

interface NBAApiResponse {
  resultSets: Array<{
    rowSet: Array<[number, number]>;
  }>;
}

async function fetchMLBScore(gameId: string): Promise<{ home: number; away: number } | null> {
  try {
    const response = await axios.get<MLBApiResponse>(`${MLB_API_BASE_URL}/game/${gameId}/boxscore`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const data = response.data;
    return {
      home: data.teams.home.teamStats.batting.runs,
      away: data.teams.away.teamStats.batting.runs
    };
  } catch (error) {
    console.error('Error fetching MLB score:', error);
    return null;
  }
}

async function fetchNBAScore(gameId: string): Promise<{ home: number; away: number } | null> {
  try {
    const response = await axios.get<NBAApiResponse>(`${NBA_API_BASE_URL}/boxscore`, {
      params: {
        GameID: gameId,
        StartPeriod: 0,
        EndPeriod: 0,
        StartRange: 0,
        EndRange: 0,
        RangeType: 0
      },
      headers: {
        'Host': 'stats.nba.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'x-nba-stats-origin': 'stats',
        'x-nba-stats-token': 'true',
        'Referer': 'https://www.nba.com/',
        'Connection': 'keep-alive',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty'
      }
    });

    const data = response.data;
    if (data.resultSets[0]?.rowSet[0]) {
      const [homeScore, awayScore] = data.resultSets[0].rowSet[0];
      return { home: homeScore, away: awayScore };
    }
    return null;
  } catch (error) {
    console.error('Error fetching NBA score:', error);
    return null;
  }
}

async function main() {
  const games = await prisma.game.findMany({
    where: {
      status: GameStatus.FINAL,
      OR: [
        {
          homeScore: null
        },
        {
          awayScore: null
        }
      ]
    }
  });

  console.log(`Found ${games.length} games without scores`);

  for (const game of games) {
    try {
      let scores: { home: number; away: number } | null = null;
      
      if (game.sport === SportType.MLB) {
        scores = await fetchMLBScore(game.id);
      } else if (game.sport === SportType.NBA) {
        scores = await fetchNBAScore(game.id);
      }

      if (scores) {
        await prisma.game.update({
          where: { id: game.id },
          data: {
            homeScore: scores.home,
            awayScore: scores.away
          }
        });
        console.log(`Updated scores for game ${game.id}: ${scores.home}-${scores.away}`);
      } else {
        console.log(`Could not fetch scores for game ${game.id}`);
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing game ${game.id}:`, error);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());