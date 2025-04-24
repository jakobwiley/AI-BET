import { PrismaClient, GameStatus } from '@prisma/client';
import { OddsApiService } from '../src/lib/oddsApi.js';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const oddsApi = new OddsApiService();

async function updateFinalGameScores() {
  try {
    // Get all FINAL games without scores
    const finalGames = await prisma.game.findMany({
      where: {
        status: GameStatus.FINAL,
        OR: [
          { homeScore: null },
          { awayScore: null }
        ]
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    console.log(`Found ${finalGames.length} FINAL games that need score updates`);

    // Process in smaller batches to respect API limits
    const batchSize = 5;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < finalGames.length; i += batchSize) {
      const batch = finalGames.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(finalGames.length / batchSize)}`);

      for (const game of batch) {
        try {
          console.log(`\nProcessing: ${game.awayTeamName} @ ${game.homeTeamName} (${format(game.gameDate, 'MMM d, yyyy')})`);
          console.log(`Game ID: ${game.id}`);

          const scores = await oddsApi.getGameScores(game.sport, game.id);
          
          if (scores) {
            console.log(`✅ Found scores: ${scores.away} - ${scores.home}`);
            
            // Update game scores
            await prisma.game.update({
              where: { id: game.id },
              data: {
                homeScore: scores.home,
                awayScore: scores.away
              }
            });

            // Update prediction outcomes
            for (const prediction of game.predictions) {
              const outcome = await determinePredictionOutcome(prediction, scores);
              await prisma.prediction.update({
                where: { id: prediction.id },
                data: { outcome }
              });
              console.log(`Updated prediction ${prediction.id}: ${prediction.predictionType} -> ${outcome}`);
            }

            updatedCount++;
          } else {
            console.log(`❌ No scores found`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          errorCount++;
        }

        // Add delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Print summary
    console.log('\n=== Update Summary ===');
    console.log(`Total FINAL games processed: ${finalGames.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors encountered: ${errorCount}`);

    // If we updated any games, show prediction performance
    if (updatedCount > 0) {
      console.log('\n=== Prediction Performance ===');
      const predictions = await prisma.prediction.findMany({
        where: {
          game: {
            status: GameStatus.FINAL,
            NOT: {
              homeScore: null,
              awayScore: null
            }
          }
        },
        include: {
          game: true
        }
      });

      const totalPredictions = predictions.length;
      const wins = predictions.filter(p => p.outcome === 'WIN').length;
      const losses = predictions.filter(p => p.outcome === 'LOSS').length;
      const pending = predictions.filter(p => p.outcome === 'PENDING').length;

      console.log(`Total Predictions: ${totalPredictions}`);
      console.log(`Wins: ${wins}`);
      console.log(`Losses: ${losses}`);
      console.log(`Pending: ${pending}`);
      console.log(`Win Rate: ${((wins / (wins + losses)) * 100).toFixed(2)}%`);

      // Performance by type
      const byType = predictions.reduce((acc, pred) => {
        if (!acc[pred.predictionType]) {
          acc[pred.predictionType] = { wins: 0, losses: 0, total: 0 };
        }
        acc[pred.predictionType].total++;
        if (pred.outcome === 'WIN') acc[pred.predictionType].wins++;
        if (pred.outcome === 'LOSS') acc[pred.predictionType].losses++;
        return acc;
      }, {} as Record<string, { wins: number; losses: number; total: number }>);

      console.log('\nPerformance by Type:');
      Object.entries(byType).forEach(([type, stats]) => {
        const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(2);
        console.log(`${type}:`);
        console.log(`  Total: ${stats.total}`);
        console.log(`  Win Rate: ${winRate}%`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function determinePredictionOutcome(prediction: any, scores: { home: number; away: number }) {
  const homeWon = scores.home > scores.away;
  const awayWon = scores.away > scores.home;
  
  switch (prediction.predictionType) {
    case 'MONEYLINE':
      if (prediction.predictionValue > 0) {
        return awayWon ? 'WIN' : homeWon ? 'LOSS' : 'PENDING';
      } else {
        return homeWon ? 'WIN' : awayWon ? 'LOSS' : 'PENDING';
      }
      
    case 'SPREAD':
      const spread = prediction.predictionValue;
      const homeWithSpread = scores.home + spread;
      return homeWithSpread > scores.away ? 'WIN' : 'LOSS';
      
    case 'TOTAL':
      const total = prediction.predictionValue;
      const combinedScore = scores.home + scores.away;
      return combinedScore > total ? 'WIN' : 'LOSS';
      
    default:
      return 'PENDING';
  }
}

// Run the update
updateFinalGameScores().catch(console.error); 