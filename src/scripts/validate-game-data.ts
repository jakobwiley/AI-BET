import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function validateGameData() {
  try {
    const games = await prisma.game.findMany({
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const issues = {
      missingScores: [] as any[],
      wrongStatus: [] as any[],
      incompleteData: [] as any[],
      pendingOldGames: [] as any[]
    };

    for (const game of games) {
      const gameDate = new Date(game.gameDate);
      const isOldGame = gameDate < today;
      
      // Check for missing scores in completed games
      if (isOldGame && (game.homeScore === null || game.awayScore === null)) {
        issues.missingScores.push({
          id: game.id,
          date: gameDate.toISOString().split('T')[0],
          teams: `${game.homeTeamName} vs ${game.awayTeamName}`,
          status: game.status
        });
      }

      // Check for wrong game status
      if (isOldGame && game.status !== 'FINAL') {
        issues.wrongStatus.push({
          id: game.id,
          date: gameDate.toISOString().split('T')[0],
          teams: `${game.homeTeamName} vs ${game.awayTeamName}`,
          status: game.status
        });
      }

      // Check for predictions with PENDING status for old games
      const pendingPredictions = game.predictions.filter(p => p.outcome === 'PENDING');
      if (isOldGame && pendingPredictions.length > 0) {
        issues.pendingOldGames.push({
          id: game.id,
          date: gameDate.toISOString().split('T')[0],
          teams: `${game.homeTeamName} vs ${game.awayTeamName}`,
          pendingPredictions: pendingPredictions.length
        });
      }

      // Check for incomplete game data
      if (!game.homeTeamId || !game.awayTeamId || !game.homeTeamName || !game.awayTeamName) {
        issues.incompleteData.push({
          id: game.id,
          date: gameDate.toISOString().split('T')[0],
          teams: `${game.homeTeamName} vs ${game.awayTeamName}`,
          missingFields: [
            !game.homeTeamId && 'homeTeamId',
            !game.awayTeamId && 'awayTeamId',
            !game.homeTeamName && 'homeTeamName',
            !game.awayTeamName && 'awayTeamName'
          ].filter(Boolean)
        });
      }
    }

    // Write detailed report to file
    const report = {
      totalGames: games.length,
      issuesSummary: {
        gamesWithMissingScores: issues.missingScores.length,
        gamesWithWrongStatus: issues.wrongStatus.length,
        gamesWithIncompleteData: issues.incompleteData.length,
        gamesWithPendingPredictions: issues.pendingOldGames.length
      },
      details: issues
    };

    const reportPath = path.join(process.cwd(), 'game-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary to console
    console.log('\nData Validation Report:');
    console.log('----------------------');
    console.log(`Total Games: ${games.length}`);
    console.log(`Games with missing scores: ${issues.missingScores.length}`);
    console.log(`Games with wrong status: ${issues.wrongStatus.length}`);
    console.log(`Games with incomplete data: ${issues.incompleteData.length}`);
    console.log(`Games with pending predictions: ${issues.pendingOldGames.length}`);
    console.log(`\nDetailed report written to: ${reportPath}`);

  } catch (error) {
    console.error('Error validating game data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateGameData(); 