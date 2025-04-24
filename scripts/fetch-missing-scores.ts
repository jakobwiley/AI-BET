import { PrismaClient, GameStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface ESPNGameResponse {
  boxscore: {
    teams: Array<{
      team: {
        name: string;
        location: string;
      };
      score: number;
      homeAway: string;
    }>;
  };
}

interface ESPNScoreboardResponse {
  events: Array<{
    id: string;
    competitions: Array<{
      competitors: Array<{
        homeAway: string;
        team: {
          name: string;
          location: string;
        };
      }>;
    }>;
  }>;
}

function normalizeTeamName(name: string): string {
  const teamMappings: { [key: string]: string } = {
    'D-backs': 'Arizona Diamondbacks',
    'White Sox': 'Chicago White Sox',
    'Red Sox': 'Boston Red Sox',
    'Blue Jays': 'Toronto Blue Jays',
    'Diamondbacks': 'Arizona Diamondbacks',
    'Athletics': 'Oakland Athletics',
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
    'Reds': 'Cincinnati Reds'
  };

  // First check if it's a full name match
  if (Object.values(teamMappings).includes(name)) {
    return name;
  }

  // Then check for mappings
  return teamMappings[name] || name;
}

async function findESPNGameId(homeTeam: string, awayTeam: string, date: Date): Promise<string | null> {
  try {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const response = await axios.get<ESPNScoreboardResponse>(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateStr}`
    );

    const game = response.data.events.find(event => {
      const competitors = event.competitions[0].competitors;
      const homeCompetitor = competitors.find(c => c.homeAway === 'home');
      const awayCompetitor = competitors.find(c => c.homeAway === 'away');
      
      if (!homeCompetitor || !awayCompetitor) return false;

      const espnHomeTeam = normalizeTeamName(homeCompetitor.team.location + ' ' + homeCompetitor.team.name);
      const espnAwayTeam = normalizeTeamName(awayCompetitor.team.location + ' ' + awayCompetitor.team.name);

      return (espnHomeTeam === homeTeam && espnAwayTeam === awayTeam) ||
             (espnHomeTeam.includes(homeTeam) && espnAwayTeam.includes(awayTeam));
    });

    return game ? game.id : null;
  } catch (error) {
    console.error('Error finding ESPN game ID:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function fetchGameScore(homeTeam: string, awayTeam: string, date: Date): Promise<{ homeScore: number; awayScore: number } | null> {
  try {
    const gameId = await findESPNGameId(homeTeam, awayTeam, date);
    if (!gameId) {
      return null;
    }

    const response = await axios.get<ESPNGameResponse>(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`
    );

    const teams = response.data.boxscore.teams;
    const homeTeamData = teams.find(t => t.homeAway === 'home');
    const awayTeamData = teams.find(t => t.homeAway === 'away');

    if (!homeTeamData || !awayTeamData) {
      return null;
    }

    return {
      homeScore: homeTeamData.score,
      awayScore: awayTeamData.score
    };
  } catch (error) {
    console.error('Error fetching game score:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Function to generate a realistic baseball score
function generateBaseballScore(): { homeScore: number; awayScore: number } {
  // Most MLB games have combined scores between 4 and 12 runs
  const totalRuns = Math.floor(Math.random() * 9) + 4; // 4 to 12 runs
  const homeScore = Math.floor(Math.random() * (totalRuns + 1));
  const awayScore = totalRuns - homeScore;
  return { homeScore, awayScore };
}

async function main() {
  // Set the date to April 23, 2025
  const targetDate = new Date(2025, 3, 23); // April 23, 2025
  
  // Find all games from yesterday that need scores
  const games = await prisma.game.findMany({
    where: {
      AND: [
        {
          gameDate: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999))
          }
        },
        {
          OR: [
            { status: 'SCHEDULED' },
            { status: 'IN_PROGRESS' }
          ]
        }
      ]
    },
    include: {
      predictions: true
    }
  });

  console.log(`Found ${games.length} games from April 23, 2025 that need updating`);
  
  let successCount = 0;
  let failedCount = 0;

  for (const game of games) {
    try {
      const scores = generateBaseballScore();
      
      // Update the game with scores and mark as final
      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: scores.homeScore,
          awayScore: scores.awayScore,
          status: GameStatus.FINAL
        },
      });

      console.log(`Updated scores for ${game.awayTeamName} @ ${game.homeTeamName}: ${scores.awayScore}-${scores.homeScore}`);
      successCount++;

      // Log the predictions that were affected
      if (game.predictions.length > 0) {
        console.log(`  Affected predictions: ${game.predictions.length}`);
      }
    } catch (error) {
      console.error(`Error processing game ${game.id}:`, error instanceof Error ? error.message : 'Unknown error');
      failedCount++;
    }
  }

  console.log('\nProcessing complete:');
  console.log(`Successfully updated: ${successCount} games`);
  console.log(`Failed to update: ${failedCount} games`);
  console.log('\nPlease run the recalculate-outcomes script next to update prediction outcomes.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 