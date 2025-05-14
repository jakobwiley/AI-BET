import pkg, { type PredictionOutcome as PredictionOutcomeType } from '@prisma/client';
const { PrismaClient, PredictionOutcome, GameStatus } = pkg;
let oddsApi;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Set up logging
const logFile = path.join(logsDir, `backfill-${new Date().toISOString().split('T')[0]}.log`);
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

// Function to check if an error is due to API rate limiting
function isRateLimitError(error: any): boolean {
  return error?.response?.data?.error_code === 'OUT_OF_USAGE_CREDITS' || 
         error?.response?.status === 401;
}

async function backfillPredictionOutcomes() {
  try {
    log('🔄 Starting prediction outcome backfill process...');

    // Dynamically import OddsApiService using absolute path
    const pathToOddsApi = path.resolve(process.cwd(), 'src/lib/oddsApi.js');
    const { OddsApiService } = await import(`file://${pathToOddsApi}`);
    oddsApi = new OddsApiService();
    // Debug: print all method names on oddsApi
    console.log('OddsApiService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(oddsApi)));

    // Mark all games in the past (not today) as FINAL
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const updated = await prisma.game.updateMany({
      where: {
        gameDate: { lt: today },
        status: { not: GameStatus.FINAL }
      },
      data: { status: GameStatus.FINAL }
    });
    log(`Marked ${updated.count} past games as FINAL.`);

    // Get all completed games with pending predictions
    const games = await prisma.game.findMany({
      where: {
        status: GameStatus.FINAL,  // Games that have finished
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

    log(`Found ${games.length} completed games with pending predictions`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let rateLimitHit = false;

    // Group games by sport for batching
    const gamesBySport = games.reduce((acc, game) => {
      if (!acc[game.sport]) acc[game.sport] = [];
      acc[game.sport].push(game);
      return acc;
    }, {});

    // Batch fetch and cache scores for each sport
    for (const sport of Object.keys(gamesBySport)) {
      const sportGames = gamesBySport[sport];
      const gameIds = sportGames.map(g => g.id);
      const scoresMap = await (oddsApi as any).getGameScoresBatch(sport, gameIds);

      for (const game of sportGames) {
        log(`\nProcessing game: ${game.homeTeamName} vs ${game.awayTeamName} (${game.gameDate.toISOString()})`);
        const scores = scoresMap[game.id];
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
      }
    }

    log('\n=== Backfill Summary ===');
    log(`Total games processed: ${games.length}`);
    log(`Predictions updated: ${updatedCount}`);
    log(`Games skipped: ${skippedCount}`);
    log(`Errors encountered: ${errorCount}`);
    
    if (rateLimitHit) {
      log(`\n⚠️ API rate limit reached. Please update your API key and run the script again to process remaining games.`);
      log(`⚠️ You can use the following command to continue from where you left off:`);
      log(`⚠️ npx ts-node scripts/backfill-prediction-outcomes.ts`);
    }
    
    log(`Log file saved to: ${logFile}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log(`Error in backfill process: ${errorMessage}`);
  } finally {
    await prisma.$disconnect();
    logStream.end();
  }
}

// Run the backfill
backfillPredictionOutcomes(); 