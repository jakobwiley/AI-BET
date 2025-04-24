import { PrismaClient, GameStatus } from '@prisma/client';
import { parseISO, isSameDay } from 'date-fns';

const prisma = new PrismaClient();

interface OddsApiScore {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{
    name: string;
    score: string;
  }> | null;
  last_update: string | null;
}

// Get the Odds API response from environment variable
const oddsApiResponse = process.env.ODDS_API_RESPONSE 
  ? JSON.parse(process.env.ODDS_API_RESPONSE) as OddsApiScore[]
  : [];

async function updateMlbScores() {
  try {
    console.log('🔄 Starting MLB scores update process...');
    
    // Get all MLB games that match the dates in the Odds API response
    const oddsApiDates = oddsApiResponse.map(g => parseISO(g.commence_time));
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB'
      }
    });
    
    console.log(`Found ${games.length} MLB games in database`);
    console.log('Odds API games:');
    oddsApiResponse.forEach(g => {
      console.log(`${g.away_team} @ ${g.home_team} (${g.commence_time})`);
    });
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const game of games) {
      try {
        // Find matching game in Odds API response by team names and date
        const oddsApiGame = oddsApiResponse.find(g => {
          const gameDate = parseISO(game.gameDate.toISOString());
          const oddsGameDate = parseISO(g.commence_time);
          
          const teamsMatch = (g.home_team === game.homeTeamName && g.away_team === game.awayTeamName) ||
                            (g.home_team === game.awayTeamName && g.away_team === game.homeTeamName);
          
          const datesMatch = isSameDay(gameDate, oddsGameDate);
          
          if (teamsMatch && !datesMatch) {
            console.log(`\nTeams match but dates don't for: ${game.awayTeamName} @ ${game.homeTeamName}`);
            console.log(`Game date: ${gameDate.toISOString()}`);
            console.log(`Odds date: ${oddsGameDate.toISOString()}`);
          }
          
          return teamsMatch && datesMatch;
        });

        if (oddsApiGame?.completed && oddsApiGame.scores) {
          const homeScore = oddsApiGame.scores.find(s => s.name === game.homeTeamName)?.score;
          const awayScore = oddsApiGame.scores.find(s => s.name === game.awayTeamName)?.score;

          if (homeScore && awayScore) {
            console.log(`\nUpdating scores for: ${game.awayTeamName} @ ${game.homeTeamName}`);
            console.log(`Score: ${awayScore} - ${homeScore}`);
            console.log(`Game Date: ${game.gameDate.toISOString()}`);
            console.log(`Odds API Date: ${oddsApiGame.commence_time}`);

            // Update game scores and status
            await prisma.game.update({
              where: { id: game.id },
              data: {
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                status: GameStatus.FINAL
              }
            });

            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing game ${game.id}:`, error);
        errorCount++;
      }
    }

    // Print summary
    console.log('\n=== Update Summary ===');
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateMlbScores(); 