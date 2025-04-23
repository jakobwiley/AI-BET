import pkg, { type PredictionOutcome as PredictionOutcomeType } from '@prisma/client';
const { PrismaClient, PredictionOutcome, GameStatus } = pkg;
import { OddsApiService } from '../src/lib/oddsApi.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const oddsApi = new OddsApiService();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Set up logging
const logFile = path.join(logsDir, `yesterday-analysis-${new Date().toISOString().split('T')[0]}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

function stripSportPrefix(gameId: string): string {
  return gameId.replace(/^(nba|mlb)-game-/, '');
}

// Function to check if an error is due to API rate limiting
function isRateLimitError(error: any): boolean {
  return error?.response?.data?.error_code === 'OUT_OF_USAGE_CREDITS' || 
         error?.response?.status === 401;
}

interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
      error_code?: string;
    };
    status?: number;
  };
}

async function determinePredictionOutcome(prediction: any, scores: { home: number; away: number } | null): Promise<PredictionOutcomeType> {
  if (!scores) {
    return PredictionOutcome.PENDING;
  }
  
  const homeWon = scores.home > scores.away;
  const awayWon = scores.away > scores.home;
  
  switch (prediction.predictionType) {
    case 'MONEYLINE':
      // For moneyline, we predict which team will win
      if (prediction.predictionValue > 0) {
        // Positive value means we're betting on the away team
        return awayWon ? PredictionOutcome.WIN : homeWon ? PredictionOutcome.LOSS : PredictionOutcome.PENDING;
      } else {
        // Negative value means we're betting on the home team
        return homeWon ? PredictionOutcome.WIN : awayWon ? PredictionOutcome.LOSS : PredictionOutcome.PENDING;
      }
      
    case 'SPREAD':
      // For spread, we need to apply the spread to the score
      const spread = prediction.predictionValue;
      const homeWithSpread = scores.home + spread;
      return homeWithSpread > scores.away ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      
    case 'TOTAL':
      // For total, we predict over/under
      const total = prediction.predictionValue;
      const combinedScore = scores.home + scores.away;
      return combinedScore > total ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      
    default:
      return PredictionOutcome.PENDING;
  }
}

async function analyzeYesterdayPredictions() {
  try {
    log('🔄 Starting yesterday\'s prediction analysis...');
    
    // Get yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all games from yesterday with pending predictions
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: yesterday,
          lt: today
        },
        predictions: {
          some: {
            outcome: PredictionOutcome.PENDING
          }
        }
      },
      include: {
        predictions: {
          where: {
            outcome: PredictionOutcome.PENDING
          }
        }
      }
    });

    log(`Found ${games.length} games from yesterday with pending predictions`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let rateLimitHit = false;

    // Process each game
    for (const game of games) {
      // If we hit the rate limit, stop processing
      if (rateLimitHit) {
        log(`⚠️ API rate limit reached. Stopping processing.`);
        log(`⚠️ Please update your API key and run the script again to process remaining games.`);
        break;
      }

      log(`\nProcessing game: ${game.homeTeamName} vs ${game.awayTeamName} (${game.gameDate.toISOString()})`);
      
      try {
        // Fetch the game scores from the API
        const scores = await oddsApi.getGameScores(game.sport, game.id);
        
        if (!scores) {
          log(`No scores found for game ${game.id}`);
          skippedCount++;
          continue;
        }
        
        // Update each prediction for this game
        for (const prediction of game.predictions) {
          const outcome = await determinePredictionOutcome(prediction, scores);
          
          if (outcome !== PredictionOutcome.PENDING) {
            await prisma.prediction.update({
              where: { id: prediction.id },
              data: { outcome }
            });
            
            log(`Updated prediction ${prediction.id}: ${prediction.predictionType} -> ${outcome}`);
            updatedCount++;
          }
        }
      } catch (error: unknown) {
        const apiError = error as ApiError;
        if (isRateLimitError(apiError)) {
          log(`⚠️ API rate limit reached: ${apiError.response?.data?.message || 'Unknown error'}`);
          rateLimitHit = true;
          errorCount++;
          break;
        } else {
          log(`Error processing game ${game.id}: ${apiError.message}`);
          errorCount++;
        }
      }
    }

    log('\n=== Analysis Summary ===');
    log(`Total games processed: ${games.length}`);
    log(`Predictions updated: ${updatedCount}`);
    log(`Games skipped: ${skippedCount}`);
    log(`Errors encountered: ${errorCount}`);
    
    if (rateLimitHit) {
      log(`\n⚠️ API rate limit reached. Please update your API key and run the script again to process remaining games.`);
      log(`⚠️ You can use the following command to continue from where you left off:`);
      log(`⚠️ npx ts-node scripts/analyze-yesterday-predictions.ts`);
    }
    
    log(`Log file saved to: ${logFile}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log(`Error in analysis process: ${errorMessage}`);
  } finally {
    await prisma.$disconnect();
    logStream.end();
  }
}

// Run the analysis
analyzeYesterdayPredictions(); 