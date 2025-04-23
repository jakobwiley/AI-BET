import pkg, { type PredictionOutcome as PredictionOutcomeType } from '@prisma/client';
const { PrismaClient, PredictionOutcome } = pkg;
import { OddsApiService } from '../src/lib/oddsApi.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const oddsApi = new OddsApiService();

interface PerformanceMetrics {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface GradePerformance {
  moneyline: PerformanceMetrics;
  spread: PerformanceMetrics;
  total: PerformanceMetrics;
}

interface OverallPerformance {
  [grade: string]: GradePerformance;
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

async function analyzePredictionPerformance() {
  try {
    console.log('📊 Starting prediction performance analysis...');
    
    // Get all completed predictions
    const predictions = await prisma.prediction.findMany({
      where: {
        outcome: {
          in: [PredictionOutcome.WIN, PredictionOutcome.LOSS]
        }
      },
      include: {
        game: true
      }
    });
    
    console.log(`Found ${predictions.length} completed predictions to analyze`);
    
    // Initialize performance tracking
    const performance: OverallPerformance = {};
    
    // Analyze each prediction
    for (const prediction of predictions) {
      const grade = calculateGrade(prediction.confidence);
      const type = prediction.predictionType;
      
      // Initialize grade if not exists
      if (!performance[grade]) {
        performance[grade] = {
          moneyline: { total: 0, wins: 0, losses: 0, winRate: 0 },
          spread: { total: 0, wins: 0, losses: 0, winRate: 0 },
          total: { total: 0, wins: 0, losses: 0, winRate: 0 }
        };
      }
      
      // Update metrics
      const metrics = performance[grade][type.toLowerCase() as keyof GradePerformance];
      metrics.total++;
      
      if (prediction.outcome === PredictionOutcome.WIN) {
        metrics.wins++;
      } else {
        metrics.losses++;
      }
      
      metrics.winRate = (metrics.wins / metrics.total) * 100;
    }
    
    // Print results
    console.log('\n📈 Prediction Performance Analysis:');
    console.log('===================================');
    
    for (const [grade, metrics] of Object.entries(performance)) {
      console.log(`\nGrade: ${grade}`);
      console.log('-----------------------------------');
      
      for (const [type, typeMetrics] of Object.entries(metrics)) {
        console.log(`${type.toUpperCase()}:`);
        console.log(`  Total Bets: ${typeMetrics.total}`);
        console.log(`  Wins: ${typeMetrics.wins}`);
        console.log(`  Losses: ${typeMetrics.losses}`);
        console.log(`  Win Rate: ${typeMetrics.winRate.toFixed(2)}%`);
      }
    }
    
    // Calculate overall performance
    const overallMetrics = {
      moneyline: { total: 0, wins: 0, losses: 0, winRate: 0 },
      spread: { total: 0, wins: 0, losses: 0, winRate: 0 },
      total: { total: 0, wins: 0, losses: 0, winRate: 0 }
    };
    
    for (const gradeMetrics of Object.values(performance)) {
      for (const [type, metrics] of Object.entries(gradeMetrics)) {
        const overall = overallMetrics[type as keyof typeof overallMetrics];
        overall.total += metrics.total;
        overall.wins += metrics.wins;
        overall.losses += metrics.losses;
        overall.winRate = (overall.wins / overall.total) * 100;
      }
    }
    
    console.log('\n📊 Overall Performance:');
    console.log('-----------------------------------');
    for (const [type, metrics] of Object.entries(overallMetrics)) {
      console.log(`${type.toUpperCase()}:`);
      console.log(`  Total Bets: ${metrics.total}`);
      console.log(`  Wins: ${metrics.wins}`);
      console.log(`  Losses: ${metrics.losses}`);
      console.log(`  Win Rate: ${metrics.winRate.toFixed(2)}%`);
    }
    
  } catch (error) {
    console.error('Error analyzing prediction performance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzePredictionPerformance(); 