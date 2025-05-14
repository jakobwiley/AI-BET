import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';
import { EnhancedPredictionModel, PredictionInput } from '../src/lib/prediction/enhanced-model';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

interface AnalysisReport {
  timestamp: string;
  totalPredictions: number;
  typeAnalysis: {
    [key in PredictionType]: {
      count: number;
      avgConfidence: number;
      enhancedConfidence: number;
      winRate: number;
      warnings: { [key: string]: number };
      rejectionRate: number;
    };
  };
  recommendations: {
    highRiskPredictions: Array<{
      id: string;
      type: PredictionType;
      value: string;
      confidence: number;
      warning: string;
    }>;
    valueBets: Array<{
      id: string;
      type: PredictionType;
      value: string;
      confidence: number;
      expectedValue: number;
    }>;
  };
}

async function getHistoricalAccuracy(type: PredictionType): Promise<{ accuracy: number; sampleSize: number }> {
  const completedPredictions = await prisma.prediction.findMany({
    where: {
      predictionType: type,
      outcome: {
        in: [PredictionOutcome.WIN, PredictionOutcome.LOSS]
      }
    }
  });

  const wins = completedPredictions.filter(p => p.outcome === PredictionOutcome.WIN).length;
  return {
    accuracy: wins / completedPredictions.length,
    sampleSize: completedPredictions.length
  };
}

async function analyzePredictions(): Promise<AnalysisReport> {
  const report: AnalysisReport = {
    timestamp: new Date().toISOString(),
    totalPredictions: 0,
    typeAnalysis: {
      [PredictionType.SPREAD]: {
        count: 0,
        avgConfidence: 0,
        enhancedConfidence: 0,
        winRate: 0,
        warnings: {},
        rejectionRate: 0
      },
      [PredictionType.MONEYLINE]: {
        count: 0,
        avgConfidence: 0,
        enhancedConfidence: 0,
        winRate: 0,
        warnings: {},
        rejectionRate: 0
      },
      [PredictionType.TOTAL]: {
        count: 0,
        avgConfidence: 0,
        enhancedConfidence: 0,
        winRate: 0,
        warnings: {},
        rejectionRate: 0
      }
    },
    recommendations: {
      highRiskPredictions: [],
      valueBets: []
    }
  };

  // Get all predictions with their games
  const predictions = await prisma.prediction.findMany({
    include: {
      game: true
    }
  });

  report.totalPredictions = predictions.length;

  // Process each prediction
  for (const prediction of predictions) {
    const typeStats = report.typeAnalysis[prediction.predictionType];
    typeStats.count++;

    // Get historical accuracy for this type
    const historicalAccuracy = await getHistoricalAccuracy(prediction.predictionType);

    // Prepare input for enhanced model
    const input: PredictionInput = {
      predictionType: prediction.predictionType,
      rawConfidence: prediction.confidence,
      predictionValue: String(prediction.predictionValue),
      game: {
        homeTeamName: prediction.game.homeTeamName,
        awayTeamName: prediction.game.awayTeamName,
        homeScore: prediction.game.homeScore,
        awayScore: prediction.game.awayScore,
        status: prediction.game.status
      },
      historicalAccuracy: {
        type: prediction.predictionType,
        accuracy: historicalAccuracy.accuracy,
        sampleSize: historicalAccuracy.sampleSize
      }
    };

    // Get enhanced model's evaluation
    const quality = new EnhancedPredictionModel().getPredictionQuality(input);

    // Update statistics
    typeStats.avgConfidence += prediction.confidence;
    typeStats.enhancedConfidence += quality.confidence;

    if (quality.warning) {
      typeStats.warnings[quality.warning] = (typeStats.warnings[quality.warning] || 0) + 1;
    }

    if (quality.recommendation === 'REJECT') {
      typeStats.rejectionRate++;
      report.recommendations.highRiskPredictions.push({
        id: prediction.id,
        type: prediction.predictionType,
        value: String(prediction.predictionValue),
        confidence: quality.confidence,
        warning: quality.warning || 'Low confidence prediction'
      });
    }

    // Track potential value bets
    if (quality.confidence > 0.8 && prediction.predictionType === PredictionType.MONEYLINE) {
      const moneylineValue = parseInt(String(prediction.predictionValue));
      const impliedProb = moneylineValue < 0 
        ? Math.abs(moneylineValue) / (Math.abs(moneylineValue) + 100)
        : 100 / (Math.abs(moneylineValue) + 100);
      
      if (quality.confidence > impliedProb + 0.1) {
        report.recommendations.valueBets.push({
          id: prediction.id,
          type: prediction.predictionType,
          value: String(prediction.predictionValue),
          confidence: quality.confidence,
          expectedValue: (quality.confidence - impliedProb) * 100
        });
      }
    }
  }

  // Calculate averages
  for (const type of Object.values(PredictionType)) {
    const stats = report.typeAnalysis[type];
    if (stats.count > 0) {
      stats.avgConfidence /= stats.count;
      stats.enhancedConfidence /= stats.count;
      stats.rejectionRate = (stats.rejectionRate / stats.count) * 100;

      // Calculate win rate for completed predictions
      const completed = predictions.filter(p => 
        p.predictionType === type && 
        (p.outcome === PredictionOutcome.WIN || p.outcome === PredictionOutcome.LOSS)
      );
      const wins = completed.filter(p => p.outcome === PredictionOutcome.WIN).length;
      stats.winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
    }
  }

  return report;
}

async function saveReport(report: AnalysisReport): Promise<void> {
  const reportsDir = path.join(process.cwd(), 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  const filename = `prediction-analysis-${report.timestamp.split('T')[0]}.json`;
  await fs.writeFile(
    path.join(reportsDir, filename),
    JSON.stringify(report, null, 2)
  );

  // Also save a summary to a log file
  const summary = `
Analysis Report (${report.timestamp})
===================================
Total Predictions: ${report.totalPredictions}

Type Analysis:
${Object.entries(report.typeAnalysis).map(([type, stats]) => `
${type}:
- Count: ${stats.count}
- Win Rate: ${stats.winRate.toFixed(1)}%
- Enhanced Confidence: ${(stats.enhancedConfidence * 100).toFixed(1)}%
- Rejection Rate: ${stats.rejectionRate.toFixed(1)}%
- Top Warnings: ${Object.entries(stats.warnings)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 3)
  .map(([warning, count]) => `\n  * ${warning}: ${count}`)
  .join('')}
`).join('\n')}

Recommendations:
- High Risk Predictions: ${report.recommendations.highRiskPredictions.length}
- Value Bets: ${report.recommendations.valueBets.length}
`;

  await fs.appendFile(
    path.join(reportsDir, 'prediction-analysis.log'),
    summary
  );
}

// Run the analysis
analyzePredictions()
  .then(async (report) => {
    await saveReport(report);
    console.log('Analysis completed and saved to reports directory');
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 