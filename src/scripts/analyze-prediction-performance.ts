import { prisma } from '../lib/prisma.ts';
import { PredictionOutcome, type PredictionType } from '@prisma/client';
import { OddsApiService } from '../lib/oddsApi.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const oddsApi = new OddsApiService();

interface PerformanceMetrics {
  totalPredictions: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
  averageConfidence: number;
  confidenceWinRate: {
    high: number;    // confidence >= 0.8
    medium: number;  // 0.6 <= confidence < 0.8
    low: number;     // confidence < 0.6
  };
}

interface PerformanceByType {
  [key: string]: PerformanceMetrics;
}

// Helper function to calculate grade based on confidence
function calculateGrade(confidence: number): string {
  if (confidence >= 85) return 'A+';
  if (confidence >= 80) return 'A';
  if (confidence >= 75) return 'A-';
  if (confidence >= 70) return 'B+';
  if (confidence >= 65) return 'B';
  if (confidence >= 60) return 'B-';
  if (confidence >= 55) return 'C+';
  if (confidence >= 50) return 'C';
  return 'C-';
}

async function determinePredictionOutcome(prediction: any, scores: { home: number; away: number } | null): Promise<PredictionOutcome> {
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

async function analyzePredictionPerformance() {
  console.log('Starting prediction performance analysis...');

  // Get all evaluated predictions
  const predictions = await prisma.prediction.findMany({
    where: {
      outcome: {
        not: 'PENDING'
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`Analyzing ${predictions.length} evaluated predictions`);

  // Overall performance
  const overallMetrics = calculatePerformanceMetrics(predictions);
  console.log('\nOverall Performance:');
  logPerformanceMetrics(overallMetrics);

  // Performance by prediction type
  const performanceByType: PerformanceByType = {};
  for (const type of ['SPREAD', 'MONEYLINE', 'TOTAL'] as PredictionType[]) {
    const typePredictions = predictions.filter(p => p.predictionType === type);
    performanceByType[type] = calculatePerformanceMetrics(typePredictions);
  }

  console.log('\nPerformance by Type:');
  for (const [type, metrics] of Object.entries(performanceByType)) {
    console.log(`\n${type}:`);
    logPerformanceMetrics(metrics);
  }

  // Performance over time
  const monthlyPerformance = analyzePerformanceOverTime(predictions);
  console.log('\nMonthly Performance:');
  for (const [month, metrics] of Object.entries(monthlyPerformance)) {
    console.log(`\n${month}:`);
    logPerformanceMetrics(metrics);
  }
}

function calculatePerformanceMetrics(predictions: any[]): PerformanceMetrics {
  const total = predictions.length;
  const wins = predictions.filter(p => p.outcome === 'WIN').length;
  const losses = predictions.filter(p => p.outcome === 'LOSS').length;
  const pushes = predictions.filter(p => p.outcome === 'PUSH').length;
  
  const winRate = total > 0 ? wins / (total - pushes) : 0;
  const averageConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / total;

  // Calculate ROI (assuming -110 odds for all bets)
  const roi = total > 0 ? ((wins * 0.91) - losses) / total : 0;

  // Calculate win rates by confidence level
  const highConfidence = predictions.filter(p => p.confidence >= 0.8);
  const mediumConfidence = predictions.filter(p => p.confidence >= 0.6 && p.confidence < 0.8);
  const lowConfidence = predictions.filter(p => p.confidence < 0.6);

  return {
    totalPredictions: total,
    wins,
    losses,
    pushes,
    winRate,
    roi,
    averageConfidence,
    confidenceWinRate: {
      high: calculateWinRate(highConfidence),
      medium: calculateWinRate(mediumConfidence),
      low: calculateWinRate(lowConfidence)
    }
  };
}

function calculateWinRate(predictions: any[]): number {
  const total = predictions.length;
  if (total === 0) return 0;
  const wins = predictions.filter(p => p.outcome === 'WIN').length;
  const pushes = predictions.filter(p => p.outcome === 'PUSH').length;
  return wins / (total - pushes);
}

function analyzePerformanceOverTime(predictions: any[]): { [key: string]: PerformanceMetrics } {
  const monthlyPerformance: { [key: string]: PerformanceMetrics } = {};

  predictions.forEach(prediction => {
    const date = new Date(prediction.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyPerformance[monthKey]) {
      monthlyPerformance[monthKey] = calculatePerformanceMetrics([]);
    }
  });

  // Calculate metrics for each month
  for (const monthKey of Object.keys(monthlyPerformance)) {
    const monthStart = new Date(monthKey + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    
    const monthPredictions = predictions.filter(p => {
      const date = new Date(p.createdAt);
      return date >= monthStart && date <= monthEnd;
    });

    monthlyPerformance[monthKey] = calculatePerformanceMetrics(monthPredictions);
  }

  return monthlyPerformance;
}

function logPerformanceMetrics(metrics: PerformanceMetrics) {
  console.log(`Total Predictions: ${metrics.totalPredictions}`);
  console.log(`Wins: ${metrics.wins}`);
  console.log(`Losses: ${metrics.losses}`);
  console.log(`Pushes: ${metrics.pushes}`);
  console.log(`Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`ROI: ${(metrics.roi * 100).toFixed(1)}%`);
  console.log(`Average Confidence: ${(metrics.averageConfidence * 100).toFixed(1)}%`);
  console.log('Win Rates by Confidence:');
  console.log(`  High (>=80%): ${(metrics.confidenceWinRate.high * 100).toFixed(1)}%`);
  console.log(`  Medium (60-80%): ${(metrics.confidenceWinRate.medium * 100).toFixed(1)}%`);
  console.log(`  Low (<60%): ${(metrics.confidenceWinRate.low * 100).toFixed(1)}%`);
}

// Run the analysis
analyzePredictionPerformance()
  .then(() => {
    console.log('\nSuccessfully completed performance analysis');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error analyzing prediction performance:', error);
    process.exit(1);
  }); 