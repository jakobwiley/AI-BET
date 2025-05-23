import { PrismaClient, GameStatus } from '@prisma/client';
import { MLBStatsService } from '../src/lib/mlbStatsApi.ts';
import { OddsApiService } from '../src/lib/oddsApi.ts';
import { PredictionType } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();
const oddsApiService = new OddsApiService();

interface ValidationResult {
  predictionType: PredictionType;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  averageConfidence: number;
  factorPerformance: {
    [key: string]: {
      impact: number;
      reliability: number;
    };
  };
}

async function validateModel() {
  try {
    // Get games from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: thirtyDaysAgo
        },
        status: 'FINAL'
      },
      include: {
        predictions: true
      }
    });

    console.log(`Analyzing ${games.length} historical games...`);

    const results: { [key in PredictionType]: ValidationResult } = {
      [PredictionType.SPREAD]: {
        predictionType: PredictionType.SPREAD,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        averageConfidence: 0,
        factorPerformance: {}
      },
      [PredictionType.MONEYLINE]: {
        predictionType: PredictionType.MONEYLINE,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        averageConfidence: 0,
        factorPerformance: {}
      },
      [PredictionType.TOTAL]: {
        predictionType: PredictionType.TOTAL,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        averageConfidence: 0,
        factorPerformance: {}
      }
    };

    // Track factor performance
    const factorImpact: { [key: string]: { correct: number; total: number; avgConfidence: number } } = {};

    for (const game of games) {
      // Get team stats at the time of the game
      const homeTeamStats = await MLBStatsService.getTeamStats(game.homeTeamName);
      const awayTeamStats = await MLBStatsService.getTeamStats(game.awayTeamName);

      // Get situational stats
      const homeTeamSituational = await MLBStatsService.getSituationalStats(game.homeTeamId);
      const awayTeamSituational = await MLBStatsService.getSituationalStats(game.awayTeamId);
      const homeBullpen = await MLBStatsService.getBullpenUsage(game.homeTeamId);
      const awayBullpen = await MLBStatsService.getBullpenUsage(game.awayTeamId);

      // Calculate offensive metrics
      const homeOffense = homeTeamStats ? {
        avgRuns: homeTeamStats.avgRunsScored,
        parkFactorHomeRuns: homeTeamStats.parkFactorHomeRuns || 1.0,
        ops: homeTeamStats.ops || 0,
        wOBA: homeTeamStats.wOBA || 0,
        wRCPlus: homeTeamStats.wRCPlus || 100,
        hardHitRate: homeTeamStats.hardHitRate || 0,
        barrelRate: homeTeamStats.barrelRate || 0,
        exitVelocity: homeTeamStats.exitVelocity || 0,
        launchAngle: homeTeamStats.launchAngle || 0,
        babip: homeTeamStats.babip || 0,
        iso: homeTeamStats.iso || 0,
        strikeOutRate: homeTeamStats.strikeOutRate || 0,
        walkRate: homeTeamStats.walkRate || 0
      } : null;

      const awayOffense = awayTeamStats ? {
        avgRuns: awayTeamStats.avgRunsScored,
        parkFactorHomeRuns: awayTeamStats.parkFactorHomeRuns || 1.0,
        ops: awayTeamStats.ops || 0,
        wOBA: awayTeamStats.wOBA || 0,
        wRCPlus: awayTeamStats.wRCPlus || 100,
        hardHitRate: awayTeamStats.hardHitRate || 0,
        barrelRate: awayTeamStats.barrelRate || 0,
        exitVelocity: awayTeamStats.exitVelocity || 0,
        launchAngle: awayTeamStats.launchAngle || 0,
        babip: awayTeamStats.babip || 0,
        iso: awayTeamStats.iso || 0,
        strikeOutRate: awayTeamStats.strikeOutRate || 0,
        walkRate: awayTeamStats.walkRate || 0
      } : null;

      // Calculate pitching metrics
      const homePitching = homeTeamStats ? {
        era: homeTeamStats.era || 0,
        whip: homeTeamStats.whip || 0,
        kPer9: homeTeamStats.kPer9 || 0,
        bbPer9: homeTeamStats.bbPer9 || 0,
        hrPer9: homeTeamStats.hrPer9 || 0,
        fip: homeTeamStats.fip || 0,
        xFIP: homeTeamStats.xFIP || 0,
        groundBallRate: homeTeamStats.groundBallRate || 0,
        flyBallRate: homeTeamStats.flyBallRate || 0,
        spinRate: homeTeamStats.spinRate || 0,
        pitchVelocity: homeTeamStats.pitchVelocity || 0
      } : null;

      const awayPitching = awayTeamStats ? {
        era: awayTeamStats.era || 0,
        whip: awayTeamStats.whip || 0,
        kPer9: awayTeamStats.kPer9 || 0,
        bbPer9: awayTeamStats.bbPer9 || 0,
        hrPer9: awayTeamStats.hrPer9 || 0,
        fip: awayTeamStats.fip || 0,
        xFIP: awayTeamStats.xFIP || 0,
        groundBallRate: awayTeamStats.groundBallRate || 0,
        flyBallRate: awayTeamStats.flyBallRate || 0,
        spinRate: awayTeamStats.spinRate || 0,
        pitchVelocity: awayTeamStats.pitchVelocity || 0
      } : null;

      // Calculate situational metrics
      const homeSituational = homeTeamSituational ? {
        vsLeft: {
          ops: parseFloat(homeTeamSituational.vsLeft.ops) || 0,
          homeRuns: homeTeamSituational.vsLeft.homeRuns || 0,
          strikeOutRate: parseFloat(homeTeamSituational.vsLeft.strikeOutRate) || 0,
          walkRate: parseFloat(homeTeamSituational.vsLeft.walkRate) || 0
        },
        vsRight: {
          ops: parseFloat(homeTeamSituational.vsRight.ops) || 0,
          homeRuns: homeTeamSituational.vsRight.homeRuns || 0,
          strikeOutRate: parseFloat(homeTeamSituational.vsRight.strikeOutRate) || 0,
          walkRate: parseFloat(homeTeamSituational.vsRight.walkRate) || 0
        },
        home: {
          ops: parseFloat(homeTeamSituational.home.ops) || 0,
          homeRuns: homeTeamSituational.home.homeRuns || 0,
          strikeOutRate: parseFloat(homeTeamSituational.home.strikeOutRate) || 0,
          walkRate: parseFloat(homeTeamSituational.home.walkRate) || 0
        },
        last30Days: {
          ops: parseFloat(homeTeamSituational.last30Days.ops) || 0,
          homeRuns: homeTeamSituational.last30Days.homeRuns || 0,
          strikeOutRate: parseFloat(homeTeamSituational.last30Days.strikeOutRate) || 0,
          walkRate: parseFloat(homeTeamSituational.last30Days.walkRate) || 0
        }
      } : null;

      const awaySituational = awayTeamSituational ? {
        vsLeft: {
          ops: parseFloat(awayTeamSituational.vsLeft.ops) || 0,
          homeRuns: awayTeamSituational.vsLeft.homeRuns || 0,
          strikeOutRate: parseFloat(awayTeamSituational.vsLeft.strikeOutRate) || 0,
          walkRate: parseFloat(awayTeamSituational.vsLeft.walkRate) || 0
        },
        vsRight: {
          ops: parseFloat(awayTeamSituational.vsRight.ops) || 0,
          homeRuns: awayTeamSituational.vsRight.homeRuns || 0,
          strikeOutRate: parseFloat(awayTeamSituational.vsRight.strikeOutRate) || 0,
          walkRate: parseFloat(awayTeamSituational.vsRight.walkRate) || 0
        },
        away: {
          ops: parseFloat(awayTeamSituational.away.ops) || 0,
          homeRuns: awayTeamSituational.away.homeRuns || 0,
          strikeOutRate: parseFloat(awayTeamSituational.away.strikeOutRate) || 0,
          walkRate: parseFloat(awayTeamSituational.away.walkRate) || 0
        },
        last30Days: {
          ops: parseFloat(awayTeamSituational.last30Days.ops) || 0,
          homeRuns: awayTeamSituational.last30Days.homeRuns || 0,
          strikeOutRate: parseFloat(awayTeamSituational.last30Days.strikeOutRate) || 0,
          walkRate: parseFloat(awayTeamSituational.last30Days.walkRate) || 0
        }
      } : null;

      // Calculate bullpen metrics
      const homeBullpenStats = homeBullpen ? {
        era: parseFloat(homeBullpen.era) || 0,
        whip: parseFloat(homeBullpen.whip) || 0,
        inningsPitched: parseFloat(homeBullpen.inningsPitched) || 0,
        strikeOuts: homeBullpen.strikeOuts || 0,
        walks: homeBullpen.walks || 0,
        homeRuns: homeBullpen.homeRuns || 0,
        last7Days: {
          era: parseFloat(homeBullpen.last7Days.era) || 0,
          whip: parseFloat(homeBullpen.last7Days.whip) || 0,
          inningsPitched: parseFloat(homeBullpen.last7Days.inningsPitched) || 0
        }
      } : null;

      const awayBullpenStats = awayBullpen ? {
        era: parseFloat(awayBullpen.era) || 0,
        whip: parseFloat(awayBullpen.whip) || 0,
        inningsPitched: parseFloat(awayBullpen.inningsPitched) || 0,
        strikeOuts: awayBullpen.strikeOuts || 0,
        walks: awayBullpen.walks || 0,
        homeRuns: awayBullpen.homeRuns || 0,
        last7Days: {
          era: parseFloat(awayBullpen.last7Days.era) || 0,
          whip: parseFloat(awayBullpen.last7Days.whip) || 0,
          inningsPitched: parseFloat(awayBullpen.last7Days.inningsPitched) || 0
        }
      } : null;

      // Analyze each prediction type
      for (const prediction of game.predictions) {
        const result = results[prediction.predictionType];
        result.totalPredictions++;
        result.averageConfidence += prediction.confidence;

        // Track factor performance
        const factors = {
          offensive: {
            ops: homeOffense?.ops || 0,
            wOBA: homeOffense?.wOBA || 0,
            wRCPlus: homeOffense?.wRCPlus || 0,
            hardHitRate: homeOffense?.hardHitRate || 0,
            barrelRate: homeOffense?.barrelRate || 0
          },
          pitching: {
            era: homePitching?.era || 0,
            whip: homePitching?.whip || 0,
            kPer9: homePitching?.kPer9 || 0,
            fip: homePitching?.fip || 0,
            xFIP: homePitching?.xFIP || 0
          },
          situational: {
            homeAdvantage: 1.1,
            parkFactor: homeOffense?.parkFactorHomeRuns || 1.0,
            vsLeft: homeSituational?.vsLeft.ops || 0,
            vsRight: homeSituational?.vsRight.ops || 0,
            last30Days: homeSituational?.last30Days.ops || 0
          },
          bullpen: {
            era: homeBullpenStats?.era || 0,
            whip: homeBullpenStats?.whip || 0,
            last7DaysEra: homeBullpenStats?.last7Days.era || 0,
            last7DaysWhip: homeBullpenStats?.last7Days.whip || 0
          }
        };

        // Check if prediction was correct
        const isCorrect = await validatePrediction(prediction, game);
        if (isCorrect) {
          result.correctPredictions++;
        }

        // Update factor performance
        for (const [category, metrics] of Object.entries(factors)) {
          for (const [metric, value] of Object.entries(metrics)) {
            const factorKey = `${category}.${metric}`;
            if (!factorImpact[factorKey]) {
              factorImpact[factorKey] = { correct: 0, total: 0, avgConfidence: 0 };
            }
            factorImpact[factorKey].total++;
            if (isCorrect) {
              factorImpact[factorKey].correct++;
            }
            factorImpact[factorKey].avgConfidence += prediction.confidence;
          }
        }
      }
    }

    // Calculate final statistics
    for (const result of Object.values(results)) {
      result.accuracy = result.correctPredictions / result.totalPredictions;
      result.averageConfidence /= result.totalPredictions;

      // Calculate factor performance
      for (const [factorKey, stats] of Object.entries(factorImpact)) {
        result.factorPerformance[factorKey] = {
          impact: stats.correct / stats.total,
          reliability: stats.avgConfidence / stats.total
        };
      }
    }

    // Print results
    console.log('\n=== Model Validation Results ===\n');
    for (const result of Object.values(results)) {
      console.log(`\n${result.predictionType}:`);
      console.log(`Total Predictions: ${result.totalPredictions}`);
      console.log(`Correct Predictions: ${result.correctPredictions}`);
      console.log(`Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
      console.log(`Average Confidence: ${(result.averageConfidence * 100).toFixed(2)}%`);
      
      console.log('\nFactor Performance:');
      const sortedFactors = Object.entries(result.factorPerformance)
        .sort(([, a], [, b]) => b.impact - a.impact);
      
      for (const [factor, performance] of sortedFactors) {
        console.log(`${factor}:`);
        console.log(`  Impact: ${(performance.impact * 100).toFixed(2)}%`);
        console.log(`  Reliability: ${(performance.reliability * 100).toFixed(2)}%`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function validatePrediction(prediction: any, game: any): Promise<boolean> {
  try {
    const homeScore = game.homeScore || 0;
    const awayScore = game.awayScore || 0;
    const margin = homeScore - awayScore;

    if (!prediction.predictionType || !prediction.predictionValue) {
      console.warn('Invalid prediction:', prediction);
      return false;
    }

    switch (prediction.predictionType) {
      case PredictionType.SPREAD:
        if (!game.oddsJson?.spread?.homeSpread) {
          console.warn('Missing spread odds for game:', game.id);
          return false;
        }
        const spread = parseFloat(prediction.predictionValue);
        return (margin > spread) === (prediction.predictionValue === game.oddsJson.spread.homeSpread.toString());

      case PredictionType.MONEYLINE:
        if (!game.oddsJson?.moneyline?.homeOdds) {
          console.warn('Missing moneyline odds for game:', game.id);
          return false;
        }
        const homeOdds = parseFloat(prediction.predictionValue);
        return (margin > 0) === (prediction.predictionValue === game.oddsJson.moneyline.homeOdds.toString());

      case PredictionType.TOTAL:
        if (!prediction.predictionValue.includes(' ')) {
          console.warn('Invalid total prediction format:', prediction.predictionValue);
          return false;
        }
        const total = parseFloat(prediction.predictionValue.split(' ')[1]);
        const isOver = prediction.predictionValue.startsWith('OVER');
        return (homeScore + awayScore > total) === isOver;

      default:
        console.warn('Unknown prediction type:', prediction.predictionType);
        return false;
    }
  } catch (error) {
    console.error('Error validating prediction:', error);
    return false;
  }
}

validateModel().catch(console.error); 