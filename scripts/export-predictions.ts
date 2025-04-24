import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportPredictions() {
  try {
    const predictions = await prisma.prediction.findMany({
      include: {
        game: true
      },
      orderBy: {
        game: {
          gameDate: 'asc'
        }
      }
    });

    const csvRows = [
      // Header row
      [
        'Game Date',
        'Sport',
        'Teams',
        'Actual Score',
        'Game Status',
        'Bet Type',
        'Prediction Value',
        'Confidence',
        'Current Outcome',
        'Has Scores',
        'Created At'
      ].join(',')
    ];

    for (const pred of predictions) {
      const game = pred.game;
      const hasScores = game.homeScore !== null && game.awayScore !== null;
      const scoreDisplay = hasScores ? `${game.homeScore}-${game.awayScore}` : 'No scores';
      const teams = `${game.homeTeamName} vs ${game.awayTeamName}`;
      
      csvRows.push([
        new Date(game.gameDate).toISOString().split('T')[0], // Game Date
        game.sport,
        teams,
        scoreDisplay,
        game.status,
        pred.predictionType,
        pred.predictionValue,
        pred.confidence,
        pred.outcome,
        hasScores ? 'Yes' : 'No',
        new Date(pred.createdAt).toISOString()
      ].map(value => `"${value}"`).join(','));
    }

    const csvContent = csvRows.join('\n');
    const outputPath = path.join(process.cwd(), 'predictions-audit.csv');
    
    fs.writeFileSync(outputPath, csvContent);
    
    console.log(`Exported ${predictions.length} predictions to ${outputPath}`);
    
    // Print some quick statistics
    const gamesWithoutScores = predictions.filter(p => 
      p.game.homeScore === null || p.game.awayScore === null
    ).length;
    
    console.log('\nQuick Statistics:');
    console.log(`Total Predictions: ${predictions.length}`);
    console.log(`Predictions without scores: ${gamesWithoutScores}`);
    console.log(`Predictions by outcome:`);
    const outcomeStats = predictions.reduce((acc, p) => {
      acc[p.outcome] = (acc[p.outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(outcomeStats).forEach(([outcome, count]) => {
      console.log(`  ${outcome}: ${count}`);
    });

  } catch (error) {
    console.error('Error exporting predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportPredictions(); 