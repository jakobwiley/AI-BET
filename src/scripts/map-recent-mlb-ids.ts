// import { PrismaClient, SportType, Game } from '@prisma/client';
import pkg from '@prisma/client';
const { PrismaClient, SportType } = pkg;
// type Game = typeof pkg.Game extends { new (): infer T } ? T : never;
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { teamNameMapping } from './team-name-mapping.js';

const prisma = new PrismaClient();
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';

interface MLBGame {
  gamePk: number;
  teams: {
    home: { team: { name: string } };
    away: { team: { name: string } };
  };
  gameDate: string;
}

interface MLBScheduleResponse {
  dates: Array<{
    date: string;
    games: MLBGame[];
  }>;
}

async function mapRecentMLBGameIds() {
  try {
    console.log('🔄 Starting MLB game ID mapping process for last 30 days...');

    // Get today's date and 30 days ago
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    console.log(`Mapping games from ${format(thirtyDaysAgo, 'MMM d, yyyy')} to ${format(today, 'MMM d, yyyy')}`);

    // Get all MLB games from the last 30 days
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: thirtyDaysAgo,
          lte: today
        },
        mlbGameId: null // Only map games missing the mapped id
      } as any,
      orderBy: {
        gameDate: 'desc'
      }
    }) as any[];

    console.log(`Found ${games.length} MLB games to process`);

    // Process in batches of 5 to respect API limits
    const batchSize = 5;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let teamMismatches = new Set<string>();
    let unmappedGames = [];
    let mlbApiGames = {};

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(games.length / batchSize)}`);

      for (const game of batch) {
        try {
          // Skip if already mapped (shouldn't happen due to query, but safe)
          if (game.mlbGameId) {
            console.log(`Skipping ${game.id} - already mapped to MLB game ID: ${game.mlbGameId}`);
            skippedCount++;
            continue;
          }

          console.log(`\nProcessing: ${game.awayTeamName} @ ${game.homeTeamName}`);
          console.log(`Date: ${format(game.gameDate, 'MMM d, yyyy')}`);

          // Map team names to MLB API format
          const mappedHomeTeam = teamNameMapping[game.homeTeamName] || game.homeTeamName;
          const mappedAwayTeam = teamNameMapping[game.awayTeamName] || game.awayTeamName;

          // Fetch games from MLB API for this date
          const dateStr = format(game.gameDate, 'MM/dd/yyyy');
          const response = await axios.get<MLBScheduleResponse>(`${MLB_API_BASE_URL}/schedule`, {
            params: {
              sportId: 1,
              date: dateStr,
              fields: 'dates,games,gamePk,teams,home,away,team,name,gameDate'
            }
          });

          const mlbGames = response.data.dates[0]?.games || [];
          mlbApiGames[dateStr] = mlbGames;
          
          // Find matching game
          const matchingGame = mlbGames.find((g: MLBGame) => 
            g.teams.home.team.name === mappedHomeTeam &&
            g.teams.away.team.name === mappedAwayTeam
          );

          if (matchingGame) {
            // Update game with MLB gamePk
            await prisma.game.update({
              where: { id: game.id },
              data: {
                mlbGameId: matchingGame.gamePk.toString()
              } as any
            });
            console.log(`✅ Mapped to MLB game ID: ${matchingGame.gamePk}`);
            updatedCount++;
          } else {
            console.log('❌ No matching MLB game found');
            errorCount++;
            teamMismatches.add(`${game.homeTeamName} -> ${mappedHomeTeam}`);
            teamMismatches.add(`${game.awayTeamName} -> ${mappedAwayTeam}`);
            unmappedGames.push({
              id: game.id,
              date: dateStr,
              homeTeam: mappedHomeTeam,
              awayTeam: mappedAwayTeam
            });
          }
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n=== Mapping Summary ===');
    console.log(`Date range: ${format(thirtyDaysAgo, 'MMM d, yyyy')} to ${format(today, 'MMM d, yyyy')}`);
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully mapped: ${updatedCount}`);
    console.log(`Already mapped (skipped): ${skippedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

    if (teamMismatches.size > 0) {
      console.log('\n=== Team Name Mismatches Found ===');
      teamMismatches.forEach(mismatch => console.log(mismatch));
    }

    // Print details of unmapped games and MLB API games for manual review
    console.log('\n=== Unmapped Games Details ===');
    unmappedGames.forEach(game => {
      console.log(`Game ID: ${game.id}, Date: ${game.date}, Home: ${game.homeTeam}, Away: ${game.awayTeam}`);
      const mlbGames = mlbApiGames[game.date] || [];
      console.log('MLB API Games for this date:');
      mlbGames.forEach((g: MLBGame) => {
        console.log(`  ${g.teams.away.team.name} @ ${g.teams.home.team.name}`);
      });
      // Check for double headers
      const doubleHeaders = mlbGames.filter((g: MLBGame) => 
        g.teams.home.team.name === game.homeTeam && g.teams.away.team.name === game.awayTeam
      );
      if (doubleHeaders.length > 1) {
        console.log('Double Header Found:');
        doubleHeaders.forEach((g: MLBGame) => {
          console.log(`  Game ID: ${g.gamePk}, ${g.teams.away.team.name} @ ${g.teams.home.team.name}`);
        });
      }
    });
  } catch (error) {
    console.error('Error in mapping process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mapRecentMLBGameIds(); 