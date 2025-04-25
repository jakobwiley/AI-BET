import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

interface ResultsByType {
  total: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  roi: number;
}

interface ResultsByGrade {
  [grade: string]: ResultsByType;
}

interface AnalysisResults {
  byType: {
    [key in PredictionType]: ResultsByType;
  };
  byGrade: ResultsByGrade;
  overall: ResultsByType;
}

function calculateROI(wins: number, losses: number, pushes: number): number {
  if (wins + losses + pushes === 0) return 0;
  // Assuming $100 bet per game and average odds of -110
  const invested = (wins + losses + pushes) * 100;
  const returns = (wins * 190.91) + (pushes * 100);
  return ((returns - invested) / invested) * 100;
}

function getGrade(confidence: number): string {
  if (confidence >= 0.90) return 'A+';
  if (confidence >= 0.85) return 'A';
  if (confidence >= 0.80) return 'A-';
  if (confidence >= 0.75) return 'B+';
  return 'B';
}

async function analyzeYesterdaysResults() {
  try {
    // Get yesterday's date range in UTC
    const yesterday = new Date('2025-04-24T00:00:00.000Z');
    const today = new Date('2025-04-25T00:00:00.000Z');

    // Initialize results structure
    const results: AnalysisResults = {
      byType: {
        SPREAD: { total: 0, wins: 0, losses: 0, pushes: 0, pending: 0, roi: 0 },
        MONEYLINE: { total: 0, wins: 0, losses: 0, pushes: 0, pending: 0, roi: 0 },
        TOTAL: { total: 0, wins: 0, losses: 0, pushes: 0, pending: 0, roi: 0 }
      },
      byGrade: {},
      overall: { total: 0, wins: 0, losses: 0, pushes: 0, pending: 0, roi: 0 }
    };

    // Get all predictions for yesterday's games
    const predictions = await prisma.prediction.findMany({
      where: {
        game: {
          gameDate: {
            gte: yesterday,
            lt: today
          }
        }
      },
      include: {
        game: true
      }
    });

    // Process each prediction
    predictions.forEach(pred => {
      const grade = getGrade(pred.confidence);
      
      // Initialize grade category if it doesn't exist
      if (!results.byGrade[grade]) {
        results.byGrade[grade] = { total: 0, wins: 0, losses: 0, pushes: 0, pending: 0, roi: 0 };
      }

      // Update counts
      results.byType[pred.predictionType].total++;
      results.byGrade[grade].total++;
      results.overall.total++;

      switch (pred.outcome) {
        case PredictionOutcome.WIN:
          results.byType[pred.predictionType].wins++;
          results.byGrade[grade].wins++;
          results.overall.wins++;
          break;
        case PredictionOutcome.LOSS:
          results.byType[pred.predictionType].losses++;
          results.byGrade[grade].losses++;
          results.overall.losses++;
          break;
        case PredictionOutcome.PENDING:
          results.byType[pred.predictionType].pending++;
          results.byGrade[grade].pending++;
          results.overall.pending++;
          break;
      }
    });

    // Calculate ROI for each category
    Object.values(results.byType).forEach(type => {
      type.roi = calculateROI(type.wins, type.losses, type.pushes);
    });
    Object.values(results.byGrade).forEach(grade => {
      grade.roi = calculateROI(grade.wins, grade.losses, grade.pushes);
    });
    results.overall.roi = calculateROI(results.overall.wins, results.overall.losses, results.overall.pushes);

    // Generate report
    let report = `Results Analysis for ${format(yesterday, 'MM/dd/yyyy')}\n\n`;
    
    report += 'Overall Results\n==============\n';
    report += `Total Predictions: ${results.overall.total}\n`;
    report += `Wins: ${results.overall.wins}\n`;
    report += `Losses: ${results.overall.losses}\n`;
    report += `Pushes: ${results.overall.pushes}\n`;
    report += `Pending: ${results.overall.pending}\n`;
    report += `ROI: ${results.overall.roi.toFixed(2)}%\n\n`;

    report += 'Results by Type\n==============\n';
    Object.entries(results.byType).forEach(([type, stats]) => {
      report += `\n${type}\n`;
      report += `-`.repeat(type.length) + '\n';
      report += `Total: ${stats.total}\n`;
      report += `Wins: ${stats.wins}\n`;
      report += `Losses: ${stats.losses}\n`;
      report += `Pushes: ${stats.pushes}\n`;
      report += `Pending: ${stats.pending}\n`;
      report += `Win Rate: ${stats.wins / (stats.wins + stats.losses) * 100 || 0}%\n`;
      report += `ROI: ${stats.roi.toFixed(2)}%\n`;
    });

    report += '\nResults by Grade\n===============\n';
    Object.entries(results.byGrade).forEach(([grade, stats]) => {
      report += `\nGrade ${grade}\n`;
      report += `-`.repeat(grade.length + 6) + '\n';
      report += `Total: ${stats.total}\n`;
      report += `Wins: ${stats.wins}\n`;
      report += `Losses: ${stats.losses}\n`;
      report += `Pushes: ${stats.pushes}\n`;
      report += `Pending: ${stats.pending}\n`;
      report += `Win Rate: ${stats.wins / (stats.wins + stats.losses) * 100 || 0}%\n`;
      report += `ROI: ${stats.roi.toFixed(2)}%\n`;
    });

    console.log(report);
    return report;

  } catch (error) {
    console.error('Error analyzing results:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
analyzeYesterdaysResults()
  .catch(console.error); 