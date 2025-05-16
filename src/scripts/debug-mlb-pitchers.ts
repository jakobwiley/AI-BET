import { PrismaClient } from '@prisma/client';
import { MLBStatsService } from '../lib/mlbStatsApi.js';

const prisma = new PrismaClient();

async function debugMLBPitchers() {
  try {
    // Get completed MLB games from the last 30 days that are missing pitcher IDs
    const now = new Date();
    const recentGames = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          lt: now
        },
        status: 'FINAL',
        OR: [
          { probableHomePitcherId: null },
          { probableAwayPitcherId: null }
        ]
      },
      orderBy: {
        gameDate: 'desc'
      },
      take: 10 // Limit to 10 games for debugging
    });

    console.log(`Found ${recentGames.length} completed games with missing pitcher IDs in the last 30 days\n`);

    for (const game of recentGames) {
      console.log(`\nAnalyzing game: ${game.awayTeamName} @ ${game.homeTeamName} (${game.gameDate.toISOString()})`);
      console.log(`Game ID: ${game.id}`);

      // Try using the game ID directly as it appears to be a valid MLB gamePk
      const gamePk = Number(game.id);
      if (!isNaN(gamePk)) {
        console.log(`Using gamePk: ${gamePk}`);
        
        // Fetch boxscore data
        const boxscore = await MLBStatsService.getActualStartingPitchers(gamePk);
        console.log('Boxscore response:', JSON.stringify(boxscore, null, 2));
      } else {
        console.log('❌ Invalid gamePk format');
      }

      console.log('----------------------------------------');
    }
  } catch (error) {
    console.error('Error debugging MLB pitchers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMLBPitchers(); 