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

    let output = 'MLB Predictions for Today\n=======================\n\n';

    for (const game of games) {
      const odds = game.oddsJson as unknown as OddsJson;
      if (!odds?.spread || !odds?.moneyline || !odds?.total) continue;

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
          value: `o${odds.total.overUnder}`,
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

        const confidence = model.calculateConfidence(input);
        const quality = model.getPredictionQuality(input);
        
        if (quality.recommendation === 'ACCEPT') {
          await prisma.prediction.create({
            data: {
              gameId: game.id,
              predictionType: pred.type,
              predictionValue: pred.value,
              confidence: Number(confidence),
              reasoning: quality.warning || `${pred.type} prediction with ${Math.round(confidence * 100)}% confidence`
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

        const confidence = model.calculateConfidence(input);
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