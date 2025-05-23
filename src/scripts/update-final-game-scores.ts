import { PrismaClient, GameStatus, SportType, PredictionOutcome } from '@prisma/client';
import axios from 'axios';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';

interface MLBBoxscoreResponse {
  teams: {
    home: {
      teamStats: {
        batting: {
          runs: number;
        };
      };
    };
    away: {
      teamStats: {
        batting: {
          runs: number;
        };
      };
    };
  };
}

async function updateFinalGameScores() {
  try {
    // Get all FINAL games without scores
    const finalGames = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        status: GameStatus.FINAL,
        OR: [
          { homeScore: null },
          { awayScore: null }
        ],
        mlbGameId: {
          not: null
        }
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
          console.log(`MLB Game ID: ${game.mlbGameId}`);

          // Fetch scores from MLB API using gamePk
          const response = await axios.get<MLBBoxscoreResponse>(`${MLB_API_BASE_URL}/game/${game.mlbGameId}/boxscore`, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          });

          const data = response.data;
          if (!data?.teams?.home?.teamStats?.batting?.runs || !data?.teams?.away?.teamStats?.batting?.runs) {
            console.log(`❌ No scores found in MLB API response`);
            errorCount++;
            continue;
          }

          const scores = {
            home: data.teams.home.teamStats.batting.runs,
            away: data.teams.away.teamStats.batting.runs
          };

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
      const pushes = predictions.filter(p => p.outcome === 'PUSH').length;
      const pending = predictions.filter(p => p.outcome === 'PENDING').length;

      console.log(`Total Predictions: ${totalPredictions}`);
      console.log(`Wins: ${wins}`);
      console.log(`Losses: ${losses}`);
      console.log(`Pushes: ${pushes}`);
      console.log(`Pending: ${pending}`);
      console.log(`Win Rate: ${((wins / (wins + losses)) * 100).toFixed(2)}%`);

      // Performance by type
      const byType = predictions.reduce((acc, pred) => {
        if (!acc[pred.predictionType]) {
          acc[pred.predictionType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }
        acc[pred.predictionType].total++;
        if (pred.outcome === 'WIN') acc[pred.predictionType].wins++;
        if (pred.outcome === 'LOSS') acc[pred.predictionType].losses++;
        if (pred.outcome === 'PUSH') acc[pred.predictionType].pushes++;
        return acc;
      }, {} as Record<string, { wins: number; losses: number; pushes: number; total: number }>);

      console.log('\nPerformance by Type:');
      Object.entries(byType).forEach(([type, stats]) => {
        const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(2);
        console.log(`${type}:`);
        console.log(`  Total: ${stats.total}`);
        console.log(`  Wins: ${stats.wins}`);
        console.log(`  Losses: ${stats.losses}`);
        console.log(`  Pushes: ${stats.pushes}`);
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
  const totalScore = scores.home + scores.away;
  
  switch (prediction.predictionType) {
    case 'MONEYLINE': {
      const value = prediction.predictionValue.trim();
      
      // Handle numeric odds
      if (/^-?\d+$/.test(value)) {
        const mlValue = parseFloat(value);
        if (mlValue < 0) {
          return homeWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
        } else {
          return awayWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
        }
      }
      
      // Handle team names/IDs
      if (value === prediction.game.homeTeamName || value === prediction.game.homeTeamId) {
        return homeWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      } else if (value === prediction.game.awayTeamName || value === prediction.game.awayTeamId) {
        return awayWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      }
      
      return PredictionOutcome.PENDING;
    }
    
    case 'SPREAD': {
      const value = prediction.predictionValue.trim();
      let spreadValue = NaN;
      
      // Handle numeric spread
      if (/^[+-]?\d+(\.\d+)?$/.test(value)) {
        spreadValue = parseFloat(value);
      } else {
        // Handle "TeamName +/-X.X" format
        const match = value.match(/^[+-](.+?)\s+([+-]?\d+(\.\d+)?)/);
        if (match) {
          const team = match[1].trim();
          const spread = parseFloat(match[2]);
          if (team === prediction.game.awayTeamName || team === prediction.game.awayTeamId) {
            spreadValue = -spread;
          } else {
            spreadValue = spread;
          }
        }
      }
      
      if (isNaN(spreadValue)) {
        return PredictionOutcome.PENDING;
      }
      
      const homeScoreWithSpread = scores.home + spreadValue;
      if (homeScoreWithSpread === scores.away) {
        return PredictionOutcome.PUSH;
      }
      return homeScoreWithSpread > scores.away ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
    }
    
    case 'TOTAL': {
      const value = prediction.predictionValue.trim();
      let totalValue = NaN;
      let isOver = null;
      
      // Try different patterns for over/under
      const patterns = [
        { pattern: /^(Over|Under)\s+(\d+\.?\d*)$/i, 
          extract: (match: RegExpMatchArray) => ({
            isOver: match[1].toLowerCase() === 'over',
            value: parseFloat(match[2])
          })
        },
        { pattern: /^[OU]\s+(\d+\.?\d*)$/i,
          extract: (match: RegExpMatchArray) => ({
            isOver: match[0][0].toLowerCase() === 'o',
            value: parseFloat(match[1])
          })
        },
        { pattern: /^[ou](\d+\.?\d*)$/i,
          extract: (match: RegExpMatchArray) => ({
            isOver: match[0][0].toLowerCase() === 'o',
            value: parseFloat(match[1])
          })
        }
      ];
      
      for (const { pattern, extract } of patterns) {
        const match = value.match(pattern);
        if (match) {
          const result = extract(match);
          totalValue = result.value;
          isOver = result.isOver;
          break;
        }
      }
      
      if (isNaN(totalValue) || isOver === null) {
        return PredictionOutcome.PENDING;
      }
      
      if (totalScore === totalValue) {
        return PredictionOutcome.PUSH;
      }
      
      return (isOver && totalScore > totalValue) || (!isOver && totalScore < totalValue) ?
        PredictionOutcome.WIN : PredictionOutcome.LOSS;
    }
    
    default:
      return PredictionOutcome.PENDING;
  }
}

// Run the update