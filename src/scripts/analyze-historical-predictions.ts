import pkg, { type PredictionOutcome as PredictionOutcomeType } from '@prisma/client';
const { PrismaClient, PredictionOutcome, GameStatus } = pkg;
import { OddsApiService } from '../src/lib/oddsApi.js';
import { format } from 'date-fns';
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
const logFile = path.join(logsDir, `historical-analysis-${new Date().toISOString().split('T')[0]}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

interface PerformanceMetrics {
  total: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  averageConfidence: number;
  profitLoss: number; // Based on $100 bet size
}

interface DetailedMetrics {
  overall: PerformanceMetrics;
  byType: Record<string, PerformanceMetrics>;
  bySport: Record<string, PerformanceMetrics>;
  byGrade: Record<string, PerformanceMetrics>;
}

function calculateMetrics(predictions: any[]): DetailedMetrics {
  const emptyMetrics = (): PerformanceMetrics => ({
    total: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    winRate: 0,
    averageConfidence: 0,
    profitLoss: 0
  });

  const metrics: DetailedMetrics = {
    overall: emptyMetrics(),
    byType: {},
    bySport: {},
    byGrade: {}
  };

  for (const pred of predictions) {
    // Update overall metrics
    metrics.overall.total++;
    metrics.overall.averageConfidence += pred.confidence;
    
    if (pred.outcome === PredictionOutcome.WIN) {
      metrics.overall.wins++;
      // Calculate profit based on American odds
      const odds = Math.abs(pred.predictionValue);
      metrics.overall.profitLoss += odds > 0 ? 100 * (odds / 100) : 100 * (100 / Math.abs(odds));
    } else if (pred.outcome === PredictionOutcome.LOSS) {
      metrics.overall.losses++;
      metrics.overall.profitLoss -= 100; // Assuming $100 bet size
    } else {
      metrics.overall.pending++;
    }

    // Initialize category metrics if they don't exist
    if (!metrics.byType[pred.predictionType]) metrics.byType[pred.predictionType] = emptyMetrics();
    if (!metrics.bySport[pred.game.sport]) metrics.bySport[pred.game.sport] = emptyMetrics();
    if (!metrics.byGrade[pred.grade]) metrics.byGrade[pred.grade] = emptyMetrics();

    // Update category metrics
    [
      metrics.byType[pred.predictionType],
      metrics.bySport[pred.game.sport],
      metrics.byGrade[pred.grade]
    ].forEach(categoryMetric => {
      categoryMetric.total++;
      categoryMetric.averageConfidence += pred.confidence;
      if (pred.outcome === PredictionOutcome.WIN) categoryMetric.wins++;
      else if (pred.outcome === PredictionOutcome.LOSS) categoryMetric.losses++;
      else categoryMetric.pending++;
    });
  }

  // Calculate win rates and average confidences
  const finalizeMetrics = (metric: PerformanceMetrics) => {
    const decidedGames = metric.wins + metric.losses;
    metric.winRate = decidedGames > 0 ? (metric.wins / decidedGames) * 100 : 0;
    metric.averageConfidence = metric.total > 0 ? (metric.averageConfidence / metric.total) * 100 : 0;
  };

  finalizeMetrics(metrics.overall);
  Object.values(metrics.byType).forEach(finalizeMetrics);
  Object.values(metrics.bySport).forEach(finalizeMetrics);
  Object.values(metrics.byGrade).forEach(finalizeMetrics);

  return metrics;
}

async function determinePredictionOutcome(prediction: any, scores: { home: number; away: number }): Promise<PredictionOutcomeType> {
  const homeWon = scores.home > scores.away;
  const awayWon = scores.away > scores.home;
  
  switch (prediction.predictionType) {
    case 'MONEYLINE':
      if (prediction.predictionValue > 0) {
        return awayWon ? PredictionOutcome.WIN : homeWon ? PredictionOutcome.LOSS : PredictionOutcome.PENDING;
      } else {
        return homeWon ? PredictionOutcome.WIN : awayWon ? PredictionOutcome.LOSS : PredictionOutcome.PENDING;
      }
      
    case 'SPREAD':
      const spread = prediction.predictionValue;
      const homeWithSpread = scores.home + spread;
      return homeWithSpread > scores.away ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      
    case 'TOTAL':
      const total = prediction.predictionValue;
      const combinedScore = scores.home + scores.away;
      return combinedScore > total ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      
    default:
      return PredictionOutcome.PENDING;
  }
}

async function analyzeHistoricalPredictions() {
  try {
    log('🔄 Starting historical prediction analysis...');

    // Get date range of predictions
    const dateRange = await prisma.prediction.aggregate({
      _min: { createdAt: true },
      _max: { createdAt: true }
    });

    if (!dateRange._min.createdAt || !dateRange._max.createdAt) {
      log('No predictions found in the database');
      return;
    }

    const startDate = dateRange._min.createdAt;
    const endDate = dateRange._max.createdAt;

    log(`Analyzing predictions from ${format(startDate, 'MMM d, yyyy')} to ${format(endDate, 'MMM d, yyyy')}`);

    // Get all predictions within the date range
    const predictions = await prisma.prediction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        game: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    log(`Found ${predictions.length} total predictions`);

    // Process predictions in batches to respect API rate limits
    const batchSize = 10;
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < predictions.length; i += batchSize) {
      const batch = predictions.slice(i, i + batchSize);
      log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(predictions.length / batchSize)}`);

      for (const prediction of batch) {
        if (prediction.outcome !== PredictionOutcome.PENDING) {
          processedCount++;
          continue;
        }

        try {
          const scores = await oddsApi.getGameScores(prediction.game.sport, prediction.game.id);
          
          if (scores) {
            const outcome = await determinePredictionOutcome(prediction, scores);
            
            if (outcome !== PredictionOutcome.PENDING) {
              await prisma.prediction.update({
                where: { id: prediction.id },
                data: { outcome }
              });
              
              prediction.outcome = outcome; // Update in-memory for metrics calculation
              updatedCount++;
              log(`Updated prediction ${prediction.id}: ${prediction.predictionType} -> ${outcome}`);
            }
          }
          
          processedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          log(`Error processing prediction ${prediction.id}: ${errorMessage}`);
          errorCount++;
        }

        // Add a small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate performance metrics
    const metrics = calculateMetrics(predictions);

    // Print detailed analysis
    log('\n=== Performance Analysis ===');
    log(`Overall Performance:`);
    log(`Total Predictions: ${metrics.overall.total}`);
    log(`Wins: ${metrics.overall.wins}`);
    log(`Losses: ${metrics.overall.losses}`);
    log(`Pending: ${metrics.overall.pending}`);
    log(`Win Rate: ${metrics.overall.winRate.toFixed(2)}%`);
    log(`Average Confidence: ${metrics.overall.averageConfidence.toFixed(2)}%`);
    log(`Profit/Loss: $${metrics.overall.profitLoss.toFixed(2)}`);

    log('\nPerformance by Type:');
    Object.entries(metrics.byType).forEach(([type, typeMetrics]) => {
      log(`\n${type}:`);
      log(`  Win Rate: ${typeMetrics.winRate.toFixed(2)}%`);
      log(`  Average Confidence: ${typeMetrics.averageConfidence.toFixed(2)}%`);
      log(`  Total Predictions: ${typeMetrics.total}`);
    });

    log('\nPerformance by Sport:');
    Object.entries(metrics.bySport).forEach(([sport, sportMetrics]) => {
      log(`\n${sport}:`);
      log(`  Win Rate: ${sportMetrics.winRate.toFixed(2)}%`);
      log(`  Average Confidence: ${sportMetrics.averageConfidence.toFixed(2)}%`);
      log(`  Total Predictions: ${sportMetrics.total}`);
    });

    log('\nPerformance by Grade:');
    Object.entries(metrics.byGrade).forEach(([grade, gradeMetrics]) => {
      log(`\n${grade}:`);
      log(`  Win Rate: ${gradeMetrics.winRate.toFixed(2)}%`);
      log(`  Average Confidence: ${gradeMetrics.averageConfidence.toFixed(2)}%`);
      log(`  Total Predictions: ${gradeMetrics.total}`);
    });

    log('\n=== Processing Summary ===');
    log(`Total predictions processed: ${processedCount}`);
    log(`Predictions updated: ${updatedCount}`);
    log(`Errors encountered: ${errorCount}`);
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
analyzeHistoricalPredictions().catch(console.error); 