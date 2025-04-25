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

async function populateTeamStats() {
  try {
    // Get all completed games to calculate stats
    const games = await prisma.game.findMany({
      where: {
        status: 'FINAL',
        homeScore: { not: null },
        awayScore: { not: null }
      }
    });

    // Initialize stats for all teams
    const teams = [...NBA_TEAMS.map(t => ({ ...t, sport: SportType.NBA })), 
                   ...MLB_TEAMS.map(t => ({ ...t, sport: SportType.MLB }))];

    for (const team of teams) {
      const homeGames = games.filter(g => g.homeTeamName === team.name);
      const awayGames = games.filter(g => g.awayTeamName === team.name);
      
      const wins = homeGames.filter(g => g.homeScore! > g.awayScore!).length +
                  awayGames.filter(g => g.awayScore! > g.homeScore!).length;
      
      const losses = homeGames.filter(g => g.homeScore! < g.awayScore!).length +
                    awayGames.filter(g => g.awayScore! < g.homeScore!).length;

      const pointsScored = homeGames.reduce((sum, g) => sum + (g.homeScore || 0), 0) +
                          awayGames.reduce((sum, g) => sum + (g.awayScore || 0), 0);

      const pointsAllowed = homeGames.reduce((sum, g) => sum + (g.awayScore || 0), 0) +
                           awayGames.reduce((sum, g) => sum + (g.homeScore || 0), 0);

      await prisma.teamStats.upsert({
        where: { teamId: team.id },
        update: {
          wins,
          losses,
          pointsScored,
          pointsAllowed,
          statsJson: {
            avgPointsScored: pointsScored / (wins + losses || 1),
            avgPointsAllowed: pointsAllowed / (wins + losses || 1),
            winPercentage: wins / (wins + losses || 1)
          }
        },
        create: {
          teamId: team.id,
          teamName: team.name,
          sport: team.sport,
          wins,
          losses,
          pointsScored,
          pointsAllowed,
          statsJson: {
            avgPointsScored: pointsScored / (wins + losses || 1),
            avgPointsAllowed: pointsAllowed / (wins + losses || 1),
            winPercentage: wins / (wins + losses || 1)
          }
        }
      });
    }

    console.log('Team stats populated successfully');
  } catch (error) {
    console.error('Error populating team stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateTeamStats(); 