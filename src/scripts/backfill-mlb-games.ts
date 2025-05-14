import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const CURRENT_SEASON = new Date().getFullYear();

// MLB team name to abbreviation mapping
const MLB_TEAM_NAME_TO_ID: Record<string, string> = {
  'Arizona Diamondbacks': 'ARI',
  'Atlanta Braves': 'ATL',
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'Chicago Cubs': 'CHC',
  'Chicago White Sox': 'CWS',
  'Cincinnati Reds': 'CIN',
  'Cleveland Guardians': 'CLE',
  'Colorado Rockies': 'COL',
  'Detroit Tigers': 'DET',
  'Houston Astros': 'HOU',
  'Kansas City Royals': 'KCR',
  'Los Angeles Angels': 'LAA',
  'Los Angeles Dodgers': 'LAD',
  'Miami Marlins': 'MIA',
  'Milwaukee Brewers': 'MIL',
  'Minnesota Twins': 'MIN',
  'New York Mets': 'NYM',
  'New York Yankees': 'NYY',
  'Oakland Athletics': 'OAK',
  'Philadelphia Phillies': 'PHI',
  'Pittsburgh Pirates': 'PIT',
  'San Diego Padres': 'SDP',
  'San Francisco Giants': 'SFG',
  'Seattle Mariners': 'SEA',
  'St. Louis Cardinals': 'STL',
  'Tampa Bay Rays': 'TBR',
  'Texas Rangers': 'TEX',
  'Toronto Blue Jays': 'TOR',
  'Washington Nationals': 'WSN',
};

async function fetchAllMLBGames(season: number) {
  // Fetch all games for the season
  const scheduleUrl = `${MLB_API_BASE}/schedule?sportId=1&season=${season}&gameType=R`;
  const res = await axios.get(scheduleUrl);
  const data = res.data as { dates: Array<{ games: any[] }> };
  const dates = data.dates || [];
  const games: any[] = dates.flatMap((d) => d.games);
  return games;
}

async function main() {
  try {
    const games = await fetchAllMLBGames(CURRENT_SEASON);
    let inserted = 0;
    for (const game of games) {
      const homeTeam = game.teams.home.team.name;
      const awayTeam = game.teams.away.team.name;
      const homeScore = game.teams.home.score;
      const awayScore = game.teams.away.score;
      const gameDate = game.gameDate;
      const status = game.status.detailedState === 'Final' ? 'FINAL' : (game.status.detailedState === 'Scheduled' ? 'SCHEDULED' : 'IN_PROGRESS');
      const gamePk = String(game.gamePk);

      const homeTeamId = MLB_TEAM_NAME_TO_ID[homeTeam] || homeTeam;
      const awayTeamId = MLB_TEAM_NAME_TO_ID[awayTeam] || awayTeam;
      // Upsert by unique gamePk (or composite of date/teams if needed)
      await prisma.game.upsert({
        where: { id: gamePk },
        update: {
          homeTeamId,
          awayTeamId,
          homeTeamName: homeTeam,
          awayTeamName: awayTeam,
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
          gameDate: new Date(gameDate),
          sport: 'MLB',
          status,
        },
        create: {
          id: gamePk,
          homeTeamId,
          awayTeamId,
          homeTeamName: homeTeam,
          awayTeamName: awayTeam,
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
          gameDate: new Date(gameDate),
          sport: 'MLB',
          status,
        }
      });
      inserted++;
    }
    console.log(`Backfilled ${inserted} MLB games for season ${CURRENT_SEASON}`);
  } catch (error) {
    console.error('Error backfilling MLB games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 