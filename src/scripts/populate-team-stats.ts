import { PrismaClient, SportType } from '@prisma/client';

const prisma = new PrismaClient();

const NBA_TEAMS = [
  { id: 'ATL', name: 'Atlanta Hawks' },
  { id: 'BOS', name: 'Boston Celtics' },
  { id: 'BKN', name: 'Brooklyn Nets' },
  { id: 'CHA', name: 'Charlotte Hornets' },
  { id: 'CHI', name: 'Chicago Bulls' },
  { id: 'CLE', name: 'Cleveland Cavaliers' },
  { id: 'DAL', name: 'Dallas Mavericks' },
  { id: 'DEN', name: 'Denver Nuggets' },
  { id: 'DET', name: 'Detroit Pistons' },
  { id: 'GSW', name: 'Golden State Warriors' },
  { id: 'HOU', name: 'Houston Rockets' },
  { id: 'IND', name: 'Indiana Pacers' },
  { id: 'LAC', name: 'Los Angeles Clippers' },
  { id: 'LAL', name: 'Los Angeles Lakers' },
  { id: 'MEM', name: 'Memphis Grizzlies' },
  { id: 'MIA', name: 'Miami Heat' },
  { id: 'MIL', name: 'Milwaukee Bucks' },
  { id: 'MIN', name: 'Minnesota Timberwolves' },
  { id: 'NOP', name: 'New Orleans Pelicans' },
  { id: 'NYK', name: 'New York Knicks' },
  { id: 'OKC', name: 'Oklahoma City Thunder' },
  { id: 'ORL', name: 'Orlando Magic' },
  { id: 'PHI', name: 'Philadelphia 76ers' },
  { id: 'PHX', name: 'Phoenix Suns' },
  { id: 'POR', name: 'Portland Trail Blazers' },
  { id: 'SAC', name: 'Sacramento Kings' },
  { id: 'SAS', name: 'San Antonio Spurs' },
  { id: 'TOR', name: 'Toronto Raptors' },
  { id: 'UTA', name: 'Utah Jazz' },
  { id: 'WAS', name: 'Washington Wizards' }
];

const MLB_TEAMS = [
  { id: 'ARI', name: 'Arizona Diamondbacks' },
  { id: 'ATL', name: 'Atlanta Braves' },
  { id: 'BAL', name: 'Baltimore Orioles' },
  { id: 'BOS', name: 'Boston Red Sox' },
  { id: 'CHC', name: 'Chicago Cubs' },
  { id: 'CWS', name: 'Chicago White Sox' },
  { id: 'CIN', name: 'Cincinnati Reds' },
  { id: 'CLE', name: 'Cleveland Guardians' },
  { id: 'COL', name: 'Colorado Rockies' },
  { id: 'DET', name: 'Detroit Tigers' },
  { id: 'HOU', name: 'Houston Astros' },
  { id: 'KCR', name: 'Kansas City Royals' },
  { id: 'LAA', name: 'Los Angeles Angels' },
  { id: 'LAD', name: 'Los Angeles Dodgers' },
  { id: 'MIA', name: 'Miami Marlins' },
  { id: 'MIL', name: 'Milwaukee Brewers' },
  { id: 'MIN', name: 'Minnesota Twins' },
  { id: 'NYM', name: 'New York Mets' },
  { id: 'NYY', name: 'New York Yankees' },
  { id: 'OAK', name: 'Oakland Athletics' },
  { id: 'PHI', name: 'Philadelphia Phillies' },
  { id: 'PIT', name: 'Pittsburgh Pirates' },
  { id: 'SDP', name: 'San Diego Padres' },
  { id: 'SFG', name: 'San Francisco Giants' },
  { id: 'SEA', name: 'Seattle Mariners' },
  { id: 'STL', name: 'St. Louis Cardinals' },
  { id: 'TBR', name: 'Tampa Bay Rays' },
  { id: 'TEX', name: 'Texas Rangers' },
  { id: 'TOR', name: 'Toronto Blue Jays' },
  { id: 'WSN', name: 'Washington Nationals' }
];

// Add normalization function for MLB team names
function normalizeMLBTeamName(name: string): string {
  const teamMappings: { [key: string]: string } = {
    'D-backs': 'Arizona Diamondbacks',
    'Diamondbacks': 'Arizona Diamondbacks',
    'White Sox': 'Chicago White Sox',
    'Red Sox': 'Boston Red Sox',
    'Blue Jays': 'Toronto Blue Jays',
    'Guardians': 'Cleveland Guardians',
    'Nationals': 'Washington Nationals',
    'Cardinals': 'St. Louis Cardinals',
    'Mariners': 'Seattle Mariners',
    'Rangers': 'Texas Rangers',
    'Astros': 'Houston Astros',
    'Brewers': 'Milwaukee Brewers',
    'Phillies': 'Philadelphia Phillies',
    'Pirates': 'Pittsburgh Pirates',
    'Rockies': 'Colorado Rockies',
    'Marlins': 'Miami Marlins',
    'Padres': 'San Diego Padres',
    'Giants': 'San Francisco Giants',
    'Yankees': 'New York Yankees',
    'Mets': 'New York Mets',
    'Angels': 'Los Angeles Angels',
    'Dodgers': 'Los Angeles Dodgers',
    'Royals': 'Kansas City Royals',
    'Tigers': 'Detroit Tigers',
    'Twins': 'Minnesota Twins',
    'Cubs': 'Chicago Cubs',
    'Rays': 'Tampa Bay Rays',
    'Braves': 'Atlanta Braves',
    'Orioles': 'Baltimore Orioles',
    'Reds': 'Cincinnati Reds',
    // Add more mappings as needed
  };
  // First check if it's a full name match
  if (Object.values(teamMappings).includes(name)) {
    return name;
  }
  // Then check for mappings
  return teamMappings[name] || name;
}

export async function populateTeamStats() {
  console.log('SCRIPT STARTED');
  try {
    // Get all completed games to calculate stats
    const games = await prisma.game.findMany({
      where: {
        status: 'FINAL',
        homeScore: { not: null },
        awayScore: { not: null }
      }
    });
    console.log(`Loaded ${games.length} FINAL games from the database`);

    // Initialize stats for all teams
    const teams = [...NBA_TEAMS.map(t => ({ ...t, sport: SportType.NBA })), 
                   ...MLB_TEAMS.map(t => ({ ...t, sport: SportType.MLB }))];

    for (const team of teams) {
      // Normalize team name for matching
      const normalizedTeamName = normalizeMLBTeamName(team.name);
      const homeGames = games.filter(g => normalizeMLBTeamName(g.homeTeamName) === normalizedTeamName);
      const awayGames = games.filter(g => normalizeMLBTeamName(g.awayTeamName) === normalizedTeamName);
      
      const wins = homeGames.filter(g => g.homeScore! > g.awayScore!).length +
                  awayGames.filter(g => g.awayScore! > g.homeScore!).length;
      
      const losses = homeGames.filter(g => g.homeScore! < g.awayScore!).length +
                    awayGames.filter(g => g.awayScore! < g.homeScore!).length;

      const gamesPlayed = homeGames.length + awayGames.length;
      const runsScored = homeGames.reduce((sum, g) => sum + (g.homeScore || 0), 0) +
                        awayGames.reduce((sum, g) => sum + (g.awayScore || 0), 0);
      const runsAllowed = homeGames.reduce((sum, g) => sum + (g.awayScore || 0), 0) +
                         awayGames.reduce((sum, g) => sum + (g.homeScore || 0), 0);
      const avgRunsScored = gamesPlayed ? runsScored / gamesPlayed : 0;
      const avgRunsAllowed = gamesPlayed ? runsAllowed / gamesPlayed : 0;
      const winPercentage = gamesPlayed ? wins / gamesPlayed : 0;

      // Debug logging
      console.log(`[${team.name}] homeGames: ${homeGames.length}, awayGames: ${awayGames.length}, wins: ${wins}, losses: ${losses}, gamesPlayed: ${gamesPlayed}`);

      await prisma.teamStats.upsert({
        where: { teamId: team.id },
        update: {
          wins,
          losses,
          pointsScored: runsScored,
          pointsAllowed: runsAllowed,
          statsJson: {
            wins,
            losses,
            gamesPlayed,
            runsScored,
            runsAllowed,
            avgRunsScored,
            avgRunsAllowed,
            winPercentage
          }
        },
        create: {
          teamId: team.id,
          teamName: team.name,
          sport: team.sport,
          wins,
          losses,
          pointsScored: runsScored,
          pointsAllowed: runsAllowed,
          statsJson: {
            wins,
            losses,
            gamesPlayed,
            runsScored,
            runsAllowed,
            avgRunsScored,
            avgRunsAllowed,
            winPercentage
          }
        }
      });

      // Logging for teams with 0 games
      if (homeGames.length + awayGames.length === 0) {
        console.warn(`No games found for team: ${team.name} (normalized: ${normalizedTeamName})`);
      }
    }

    console.log('Finished processing all teams.');
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await prisma.$disconnect();
    console.log('SCRIPT END');
  }
}

populateTeamStats(); 