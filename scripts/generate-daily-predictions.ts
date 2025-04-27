import { PrismaClient, PredictionType, GameStatus } from '@prisma/client';
import { format } from 'date-fns';
import { writeFile } from 'fs/promises';
import { EnhancedPredictionModel, PredictionInput } from '../src/lib/prediction/enhanced-model.js';

const prisma = new PrismaClient();
const model = new EnhancedPredictionModel();

interface OddsJson {
  spread: {
    homeSpread: number;
    awaySpread: number;
    homeOdds: number;
    awayOdds: number;
  };
  moneyline: {
    homeOdds: number;
    awayOdds: number;
  };
  total: {
    overUnder: number;
    overOdds: number;
    underOdds: number;
  };
}

async function generatePredictions() {
  try {
    // Get today's games
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all game IDs for today
    const todaysGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: tomorrow
        },
        status: GameStatus.SCHEDULED,
        oddsJson: {
          not: null
        }
      },
      select: { id: true }
    });
    const todaysGameIds = todaysGames.map(g => g.id);
    // Delete all predictions for today's games
    if (todaysGameIds.length > 0) {
      await prisma.prediction.deleteMany({ where: { gameId: { in: todaysGameIds } } });
    }

    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: tomorrow
        },
        status: GameStatus.SCHEDULED,
        oddsJson: {
          not: null
        }
      }
    });

    // Fetch all team stats for today
    const teamStatsRecords = await prisma.teamStats.findMany({ where: { sport: 'MLB' } });
    const teamStatsMap = Object.fromEntries(teamStatsRecords.map(ts => [ts.teamName, ts]));

    let output = 'MLB Predictions for Today\n=======================\n\n';

    for (const game of games) {
      const odds = game.oddsJson as unknown as OddsJson;
      if (!odds?.spread || !odds?.moneyline || !odds?.total) continue;

      // Ensure total value is a valid number
      const totalValue = Number(odds.total.overUnder);
      if (isNaN(totalValue)) {
        // Skip TOTAL prediction if total is not a valid number
        continue;
      }
      // Get recent scoring from teamStats
      let homeStatsRaw = teamStatsMap[game.homeTeamName]?.statsJson;
      let awayStatsRaw = teamStatsMap[game.awayTeamName]?.statsJson;
      const homeStats = typeof homeStatsRaw === 'string' ? JSON.parse(homeStatsRaw) : homeStatsRaw as any;
      const awayStats = typeof awayStatsRaw === 'string' ? JSON.parse(awayStatsRaw) : awayStatsRaw as any;
      let avgRecentRuns = undefined;
      if (homeStats && awayStats) {
        const homeAvg = homeStats.lastNGames?.runsScored / (homeStats.lastNGames?.wins + homeStats.lastNGames?.losses || 1);
        const awayAvg = awayStats.lastNGames?.runsScored / (awayStats.lastNGames?.wins + awayStats.lastNGames?.losses || 1);
        if (homeAvg && awayAvg) {
          avgRecentRuns = homeAvg + awayAvg;
        }
      }
      // Decide OVER or UNDER for total
      let totalPick = 'OVER';
      if (avgRecentRuns !== undefined && avgRecentRuns < totalValue) {
        totalPick = 'UNDER';
      }
      // Generate predictions for each type
      const predictions = [
        { 
          type: PredictionType.SPREAD,
          value: odds.spread.homeSpread.toString(),
          rawConfidence: 0.8,
          game: {
            homeTeamName: game.homeTeamName,
            awayTeamName: game.awayTeamName,
            status: game.status
          }
        },
        { 
          type: PredictionType.MONEYLINE,
          value: odds.moneyline.homeOdds.toString(),
          rawConfidence: 0.8,
          game: {
            homeTeamName: game.homeTeamName,
            awayTeamName: game.awayTeamName,
            status: game.status
          }
        },
        {
          type: PredictionType.TOTAL,
          value: `${totalPick} ${totalValue}`,
          rawConfidence: 0.8,
          game: {
            homeTeamName: game.homeTeamName,
            awayTeamName: game.awayTeamName,
            status: game.status
          }
        }
      ];

      // Save predictions to database
      for (const pred of predictions) {
        const input: PredictionInput = {
          predictionType: pred.type,
          predictionValue: pred.value,
          rawConfidence: pred.rawConfidence,
          game: pred.game
        };

        let confidence = model.calculateConfidence(input);
        const quality = model.getPredictionQuality(input);
        
        // --- Model projections for projectionJson ---
        let projectionJson: any = {};
        // Helper: get average runs scored/allowed
        function getAvg(statObj: any, key: string, fallbackKey: string) {
          if (typeof statObj?.[key] === 'number' && statObj[key] > 0) return statObj[key];
          // Fallback to recent stats
          if (statObj?.lastNGames && statObj.lastNGames[fallbackKey] && (statObj.lastNGames.wins + statObj.lastNGames.losses) > 0) {
            return statObj.lastNGames[fallbackKey] / (statObj.lastNGames.wins + statObj.lastNGames.losses);
          }
          return 4.5; // League average fallback
        }
        if (pred.type === PredictionType.SPREAD) {
          let homeAvg = getAvg(homeStats, 'avgRunsScored', 'runsScored');
          let awayAvg = getAvg(awayStats, 'avgRunsScored', 'runsScored');
          let homeAllowed = getAvg(homeStats, 'avgRunsAllowed', 'runsAllowed');
          let awayAllowed = getAvg(awayStats, 'avgRunsAllowed', 'runsAllowed');
          let projectedMargin = ((homeAvg + awayAllowed) / 2) - ((awayAvg + homeAllowed) / 2) + 0.3;
          projectionJson = {
            projectedMargin: Math.round(projectedMargin * 2) / 2,
            projectedTeam: projectedMargin >= 0 ? game.homeTeamName : game.awayTeamName
          };
        } else if (pred.type === PredictionType.TOTAL) {
          let homeAvg = getAvg(homeStats, 'avgRunsScored', 'runsScored');
          let awayAvg = getAvg(awayStats, 'avgRunsScored', 'runsScored');
          let homeAllowed = getAvg(homeStats, 'avgRunsAllowed', 'runsAllowed');
          let awayAllowed = getAvg(awayStats, 'avgRunsAllowed', 'runsAllowed');
          let projectedHome = (homeAvg + awayAllowed) / 2;
          let projectedAway = (awayAvg + homeAllowed) / 2;
          let projectedTotal = projectedHome + projectedAway;
          projectionJson = {
            projectedHome: Math.round(projectedHome * 10) / 10,
            projectedAway: Math.round(projectedAway * 10) / 10,
            projectedTotal: Math.round(projectedTotal * 2) / 2
          };
        } else if (pred.type === PredictionType.MONEYLINE) {
          // Use win percentage as proxy for win probability
          let homeWinPct = homeStats?.winPercentage || 0.5;
          let awayWinPct = awayStats?.winPercentage || 0.5;
          let homeProb = (homeWinPct + 0.03) / ((homeWinPct + 0.03) + awayWinPct);
          let awayProb = awayWinPct / ((homeWinPct + 0.03) + awayWinPct);
          projectionJson = {
            projectedWinner: homeProb > awayProb ? game.homeTeamName : game.awayTeamName,
            winProbability: Math.round((homeProb > awayProb ? homeProb : awayProb) * 100)
          };
        }
        // --- End model projections ---

        // For TOTAL: If model's projected total is within 0.2 runs of the line, set low confidence
        if (pred.type === PredictionType.TOTAL && projectionJson && projectionJson.projectedTotal !== undefined) {
          const totalMatch = pred.value.match(/(OVER|UNDER)\s*(\d+(\.\d+)?)/i);
          if (totalMatch && Math.abs(Number(totalMatch[2]) - projectionJson.projectedTotal) < 0.2) {
            confidence = 0.55;
          }
        }

        if (quality.recommendation === 'ACCEPT') {
          await prisma.prediction.create({
            data: {
              gameId: game.id,
              predictionType: pred.type,
              predictionValue: pred.value,
              confidence: Number(confidence),
              reasoning: quality.warning || `${pred.type} prediction with ${Math.round(confidence * 100)}% confidence`,
              projectionJson
            }
          });
        }
      }

      // Format for output file
      output += `${game.awayTeamName} @ ${game.homeTeamName}\n`;
      output += `Game Time: ${format(game.gameDate, 'M/d/yyyy, h:mm:ss a')}\n`;
      output += '----------------------------------------\n';

      for (const pred of predictions) {
        const input: PredictionInput = {
          predictionType: pred.type,
          predictionValue: pred.value,
          rawConfidence: pred.rawConfidence,
          game: pred.game
        };

        let confidence = model.calculateConfidence(input);
        const quality = model.getPredictionQuality(input);
        
        output += `${pred.type}: ${pred.value}\n`;
        output += `Confidence: ${Math.round(confidence * 100)}%\n`;
        if (quality.warning) {
          output += `Warning: ${quality.warning}\n`;
        }
        output += `Recommendation: ${quality.recommendation}\n\n`;
      }
      output += '\n';
    }

    // Still write to file for reference
    await writeFile('todays-picks.txt', output);
    console.log('Predictions generated and saved to database successfully');

  } catch (error) {
    console.error('Error generating predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generatePredictions().catch(console.error);