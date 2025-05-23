import { PrismaClient, GameStatus, SportType } from '@prisma/client';
import type { Game } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';
const NBA_API_BASE_URL = 'https://stats.nba.com/stats/boxscoresummaryv2';

interface MLBTeam {
  team: {
    id: number;
    name: string;
  };
  score?: number;
}

interface MLBGame {
  gamePk: number;
  gameDate: string;
  gameTime: string;
  status: {
    abstractGameState: string;
    codedGameState: string;
    detailedState: string;
  };
  teams: {
    away: MLBTeam;
    home: MLBTeam;
  };
}

interface MLBScheduleResponse {
  dates: Array<{
    date: string;
    games: MLBGame[];
  }>;
}

interface MLBApiResponse {
  teams: {
    home: MLBTeam;
    away: MLBTeam;
  };
}

interface NBAApiResponse {
  resultSets: Array<{
    rowSet: Array<[number, number]>;
  }>;
}

// Helper function to extract the external game ID from our internal ID
function getExternalGameId(gameId: string): string {
  // For MLB games, we expect the ID to be in the format "mlb-game-{gameId}"
  const mlbMatch = gameId.match(/^mlb-game-(\d+)$/);
  if (mlbMatch) {
    return mlbMatch[1];
  }
  // For NBA games, remove the sport prefix and 'game-' if they exist
  return gameId.replace(/^(nba|mlb)-game-/, '');
}

async function fetchMLBGames(date: string): Promise<MLBGame[]> {
  try {
    const response = await axios.get<MLBScheduleResponse>(
      `${MLB_API_BASE_URL}/schedule?sportId=1&date=${date}&hydrate=team`
    );
    
    if (response.data.dates.length === 0) {
      return [];
    }
    
    return response.data.dates[0].games;
  } catch (error) {
    console.error('Error fetching MLB games:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function fetchMLBScore(gameId: string): Promise<{ home: number; away: number } | null> {
  try {
    const externalId = getExternalGameId(gameId);
    if (!externalId.match(/^\d+$/)) {
      console.log(`Invalid MLB game ID format: ${gameId}`);
      return null;
    }
    const response = await axios.get<MLBApiResponse>(`${MLB_API_BASE_URL}/game/${externalId}/boxscore`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const data = response.data;
    // The scores are in the teams.home.score and teams.away.score fields
    if (!data?.teams?.home?.score || !data?.teams?.away?.score) {
      console.log(`No scores found in MLB API response for game ${gameId}`);
      return null;
    }

    return {
      home: data.teams.home.score,
      away: data.teams.away.score
    };
  } catch (error) {
    console.error('MLB API request failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function fetchNBAScore(gameId: string): Promise<{ home: number; away: number } | null> {
  try {
    const externalId = getExternalGameId(gameId);
    const response = await axios.get<NBAApiResponse>(`${NBA_API_BASE_URL}/boxscore`, {
      params: {
        GameID: externalId,
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
    console.error('NBA API request failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function storeMLBGames(games: MLBGame[]) {
  const prisma = new PrismaClient();

  try {
    for (const game of games) {
      await prisma.game.upsert({
        where: {
          id: `mlb-game-${game.gamePk}`
        },
        update: {
          homeTeamName: game.teams.home.team.name,
          awayTeamName: game.teams.away.team.name,
          homeTeamId: game.teams.home.team.id.toString(),
          awayTeamId: game.teams.away.team.id.toString(),
          gameDate: new Date(game.gameDate),
          startTime: game.gameTime,
          status: mapGameStatus(game.status.abstractGameState),
          homeScore: game.teams.home.score ?? null,
          awayScore: game.teams.away.score ?? null
        },
        create: {
          id: `mlb-game-${game.gamePk}`,
          sport: 'MLB',
          homeTeamName: game.teams.home.team.name,
          awayTeamName: game.teams.away.team.name,
          homeTeamId: game.teams.home.team.id.toString(),
          awayTeamId: game.teams.away.team.id.toString(),
          gameDate: new Date(game.gameDate),
          startTime: game.gameTime,
          status: mapGameStatus(game.status.abstractGameState),
          homeScore: game.teams.home.score ?? null,
          awayScore: game.teams.away.score ?? null
        }
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

function mapGameStatus(status: string): GameStatus {
  switch (status.toUpperCase()) {
    case 'FINAL':
      return 'FINAL';
    case 'IN_PROGRESS':
    case 'LIVE':
      return 'IN_PROGRESS';
    case 'PRE_GAME':
    case 'SCHEDULED':
    case 'PREVIEW':
      return 'SCHEDULED';
    case 'POSTPONED':
      return 'POSTPONED';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    default:
      return 'SCHEDULED';
  }
}

async function main() {
  try {
    // First, fetch today's games
    const today = new Date().toISOString().split('T')[0];
    const games = await fetchMLBGames(today);
    await storeMLBGames(games);

    // Then, fetch scores for past games that are missing scores
    const gamesWithMissingScores = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        status: 'FINAL',
        OR: [
          { homeScore: null },
          { awayScore: null }
        ]
      }
    });

    console.log(`Found ${gamesWithMissingScores.length} past games with missing scores`);

    for (const game of gamesWithMissingScores) {
      const gameId = game.id.replace('mlb-game-', '');
      try {
        const score = await fetchMLBScore(game.id);
        if (score) {
          await prisma.game.update({
            where: { id: game.id },
            data: {
              homeScore: score.home,
              awayScore: score.away
            }
          });
          console.log(`Updated scores for game ${game.id}: ${score.home}-${score.away}`);
        }
      } catch (error) {
        console.error(`Error fetching score for game ${game.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();