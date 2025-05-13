import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

interface PredictionAnalysis {
  total: number;
  correct: number;
  incorrect: number;
  winRate: number;
  averageConfidence: number;
  profitLoss: number;
  roi: number;
}

interface DetailedAnalysis {
  overall: PredictionAnalysis;
  byGrade: Record<string, PredictionAnalysis>;
  byType: Record<PredictionType, PredictionAnalysis>;
  byConfidenceRange: Record<string, PredictionAnalysis>;
}

// Calculate grade based on confidence level
function calculateGrade(confidence: number): string {
  const confidencePercent = confidence > 1 ? confidence : confidence * 100;
  
  if (confidencePercent >= 90) return 'A+';
  if (confidencePercent >= 85) return 'A';
  if (confidencePercent >= 80) return 'A-';
  if (confidencePercent >= 75) return 'B+';
  if (confidencePercent >= 70) return 'B';
  if (confidencePercent >= 65) return 'B-';
  if (confidencePercent >= 60) return 'C+';
  return 'C';
}

function getConfidenceRange(confidence: number): string {
  const confidencePercent = confidence > 1 ? confidence : confidence * 100;
  if (confidencePercent >= 90) return '90-100%';
  if (confidencePercent >= 80) return '80-89%';
  if (confidencePercent >= 70) return '70-79%';
  if (confidencePercent >= 60) return '60-69%';
  return '<60%';
}

function initializeAnalysis(): PredictionAnalysis {
  return {
    total: 0,
    correct: 0,
    incorrect: 0,
    winRate: 0,
    averageConfidence: 0,
    profitLoss: 0,
    roi: 0
  };
}

function calculateROI(profitLoss: number, totalBets: number): number {
  if (totalBets === 0) return 0;
  const totalInvestment = totalBets * 5; // Now using $5 per bet
  return (profitLoss / totalInvestment) * 100;
}

async function analyzeMlbPredictions() {
  try {
    console.log('🔄 Starting MLB prediction analysis...');

    // Get all MLB games with final status and their predictions
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        status: GameStatus.FINAL,
        predictions: {
          some: {} // Only games with predictions
        }
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${games.length} completed MLB games with predictions`);

    const analysis: DetailedAnalysis = {
      overall: initializeAnalysis(),
      byGrade: {},
      byType: {
        SPREAD: initializeAnalysis(),
        MONEYLINE: initializeAnalysis(),
        TOTAL: initializeAnalysis()
      },
      byConfidenceRange: {}
    };

    // Process each game's predictions
    for (const game of games) {
      for (const prediction of game.predictions) {
        // Get prediction categories
        const grade = calculateGrade(prediction.confidence);
        const confidenceRange = getConfidenceRange(prediction.confidence);
        const type = prediction.predictionType;

        // Initialize category analyses if they don't exist
        if (!analysis.byGrade[grade]) {
          analysis.byGrade[grade] = initializeAnalysis();
        }
        if (!analysis.byConfidenceRange[confidenceRange]) {
          analysis.byConfidenceRange[confidenceRange] = initializeAnalysis();
        }

        // Update all relevant analyses
        [
          analysis.overall,
          analysis.byGrade[grade],
          analysis.byType[type],
          analysis.byConfidenceRange[confidenceRange]
        ].forEach(categoryAnalysis => {
          categoryAnalysis.total++;
          categoryAnalysis.averageConfidence += prediction.confidence;

          if (prediction.outcome === PredictionOutcome.WIN) {
            categoryAnalysis.correct++;
            // Calculate profit based on American odds
            const odds = Math.abs(Number(prediction.predictionValue));
            if (typeof odds === 'number' && !isNaN(odds) && odds > 0) {
              // American odds payout calculation for $5 bet
              if (Number(prediction.predictionValue) > 0) {
                categoryAnalysis.profitLoss += 5 * (odds / 100);
              } else {
                categoryAnalysis.profitLoss += 5 * (100 / odds);
              }
            } else {
              // If odds are missing or invalid, treat as even money
              categoryAnalysis.profitLoss += 5;
            }
          } else if (prediction.outcome === PredictionOutcome.LOSS) {
            categoryAnalysis.incorrect++;
            categoryAnalysis.profitLoss -= 5; // Now using $5 bet size
          }
        });
      }
    }

    // Calculate final metrics for all categories
    const finalizeAnalysis = (analysis: PredictionAnalysis) => {
      if (analysis.total > 0) {
        analysis.winRate = (analysis.correct / analysis.total) * 100;
        analysis.averageConfidence = (analysis.averageConfidence / analysis.total) * 100;
        analysis.roi = calculateROI(analysis.profitLoss, analysis.total);
      }
    };

    finalizeAnalysis(analysis.overall);
    Object.values(analysis.byGrade).forEach(finalizeAnalysis);
    Object.values(analysis.byType).forEach(finalizeAnalysis);
    Object.values(analysis.byConfidenceRange).forEach(finalizeAnalysis);

    // Print results
    console.log('\n📊 MLB Prediction Analysis Results');
    console.log('================================');

    console.log('\n📈 Overall Performance:');
    console.log(`Total Predictions: ${analysis.overall.total}`);
    console.log(`Correct: ${analysis.overall.correct}`);
    console.log(`Incorrect: ${analysis.overall.incorrect}`);
    console.log(`Win Rate: ${analysis.overall.winRate.toFixed(1)}%`);
    console.log(`Average Confidence: ${analysis.overall.averageConfidence.toFixed(1)}%`);
    console.log(`Profit/Loss: $${analysis.overall.profitLoss.toFixed(2)}`);
    console.log(`ROI: ${analysis.overall.roi.toFixed(1)}%`);

    console.log('\n📊 Performance by Prediction Type:');
    Object.entries(analysis.byType).forEach(([type, stats]) => {
      if (stats.total > 0) {
        console.log(`\n${type}:`);
        console.log(`Total: ${stats.total}`);
        console.log(`Win Rate: ${stats.winRate.toFixed(1)}%`);
        console.log(`Profit/Loss: $${stats.profitLoss.toFixed(2)}`);
        console.log(`ROI: ${stats.roi.toFixed(1)}%`);
      }
    });

    console.log('\n📝 Performance by Grade:');
    Object.entries(analysis.byGrade)
      .sort(([gradeA], [gradeB]) => gradeA.localeCompare(gradeB))
      .forEach(([grade, stats]) => {
        if (stats.total > 0) {
          console.log(`\n${grade}:`);
          console.log(`Total: ${stats.total}`);
          console.log(`Win Rate: ${stats.winRate.toFixed(1)}%`);
          console.log(`Profit/Loss: $${stats.profitLoss.toFixed(2)}`);
          console.log(`ROI: ${stats.roi.toFixed(1)}%`);
        }
      });

    console.log('\n📈 Performance by Confidence Range:');
    Object.entries(analysis.byConfidenceRange)
      .sort(([rangeA], [rangeB]) => {
        const numA = parseInt(rangeA);
        const numB = parseInt(rangeB);
        return numB - numA;
      })
      .forEach(([range, stats]) => {
        if (stats.total > 0) {
          console.log(`\n${range}:`);
          console.log(`Total: ${stats.total}`);
          console.log(`Win Rate: ${stats.winRate.toFixed(1)}%`);
          console.log(`Profit/Loss: $${stats.profitLoss.toFixed(2)}`);
          console.log(`ROI: ${stats.roi.toFixed(1)}%`);
        }
      });

  } catch (error) {
    console.error('Error analyzing MLB predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeMlbPredictions(); 