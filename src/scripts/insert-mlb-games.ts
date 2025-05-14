import { PrismaClient, SportType, GameStatus } from '@prisma/client';
import { parseISO } from 'date-fns';

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

async function insertMlbGames() {
  try {
    console.log('🔄 Starting MLB games insertion process...');
    
    let insertedCount = 0;
    let errorCount = 0;

    for (const game of oddsApiResponse) {
      try {
        // Check if game already exists
        const existingGame = await prisma.game.findFirst({
          where: {
            sport: 'MLB',
            homeTeamName: game.home_team,
            awayTeamName: game.away_team,
            gameDate: parseISO(game.commence_time)
          }
        });

        if (!existingGame) {
          // Create new game
          const newGame = await prisma.game.create({
            data: {
              id: game.id,
              sport: SportType.MLB,
              homeTeamName: game.home_team,
              awayTeamName: game.away_team,
              homeTeamId: game.home_team.toLowerCase().replace(/\s+/g, '-'),
              awayTeamId: game.away_team.toLowerCase().replace(/\s+/g, '-'),
              gameDate: parseISO(game.commence_time),
              startTime: game.commence_time,
              status: game.completed ? GameStatus.FINAL : GameStatus.SCHEDULED,
              homeScore: game.completed && game.scores ? 
                parseInt(game.scores.find(s => s.name === game.home_team)?.score || '0') : 
                null,
              awayScore: game.completed && game.scores ? 
                parseInt(game.scores.find(s => s.name === game.away_team)?.score || '0') : 
                null
            }
          });

          console.log(`\nInserted: ${game.away_team} @ ${game.home_team}`);
          console.log(`Date: ${game.commence_time}`);
          if (game.completed && game.scores) {
            console.log(`Score: ${game.scores.find(s => s.name === game.away_team)?.score} - ${game.scores.find(s => s.name === game.home_team)?.score}`);
          }
          insertedCount++;
        } else {
          console.log(`\nSkipped existing game: ${game.away_team} @ ${game.home_team}`);
        }
      } catch (error) {
        console.error(`Error processing game:`, error);
        errorCount++;
      }
    }

    // Print summary
    console.log('\n=== Insertion Summary ===');
    console.log(`Total games processed: ${oddsApiResponse.length}`);
    console.log(`Successfully inserted: ${insertedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the insertion
insertMlbGames(); 