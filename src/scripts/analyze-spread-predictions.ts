import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

interface SpreadAnalysis {
  totalPredictions: number;
  correctPredictions: number;
  pushes: number;
  accuracy: number;
  averageConfidence: number;
  performanceByConfidence: {
    [range: string]: {
      total: number;
      correct: number;
      accuracy: number;
    };
  };
  performanceBySpread: {
    [range: string]: {
      total: number;
      correct: number;
      accuracy: number;
    };
  };
  incorrectPredictions: {
    [range: string]: number;
  };
}

async function analyzeSpreadPredictions() {
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
        predictions: {
          where: {
            predictionType: PredictionType.SPREAD
          }
        }
      }
    });

    const analysis: SpreadAnalysis = {
      totalPredictions: 0,
      correctPredictions: 0,
      pushes: 0,
      accuracy: 0,
      averageConfidence: 0,
      performanceByConfidence: {},
      performanceBySpread: {},
      incorrectPredictions: {}
    };

    let totalConfidence = 0;

    for (const game of games) {
      for (const prediction of game.predictions) {
        analysis.totalPredictions++;
        totalConfidence += prediction.confidence;

        // Get confidence range
        const confidenceRange = Math.floor(prediction.confidence / 5) * 5;
        const rangeKey = `${confidenceRange}-${confidenceRange + 4}`;
        
        if (!analysis.performanceByConfidence[rangeKey]) {
          analysis.performanceByConfidence[rangeKey] = {
            total: 0,
            correct: 0,
            accuracy: 0
          };
        }
        analysis.performanceByConfidence[rangeKey].total++;

        // Parse spread value
        const spreadValue = parseFloat(prediction.predictionValue);
        if (!isNaN(spreadValue)) {
          const absSpread = Math.abs(spreadValue);
          const spreadRange = Math.floor(absSpread * 2) / 2;
          const spreadKey = `${spreadRange}-${spreadRange + 0.4}`;

          if (!analysis.performanceBySpread[spreadKey]) {
            analysis.performanceBySpread[spreadKey] = {
              total: 0,
              correct: 0,
              accuracy: 0
            };
          }
          analysis.performanceBySpread[spreadKey].total++;

          // Calculate outcome
          const homeScore = game.homeScore || 0;
          const awayScore = game.awayScore || 0;
          const actualSpread = homeScore - awayScore;
          const spreadDiff = Math.abs(actualSpread - spreadValue);

          if (prediction.outcome === PredictionOutcome.WIN) {
            analysis.correctPredictions++;
            analysis.performanceByConfidence[rangeKey].correct++;
            analysis.performanceBySpread[spreadKey].correct++;
          } else if (prediction.outcome === PredictionOutcome.PUSH) {
            analysis.pushes++;
          } else {
            // Track incorrect predictions by margin
            const marginKey = spreadDiff <= 0.5 ? '0.5 or less' :
                            spreadDiff <= 1 ? '0.6-1.0' :
                            spreadDiff <= 2 ? '1.1-2.0' :
                            spreadDiff <= 3 ? '2.1-3.0' : '3.1+';
            analysis.incorrectPredictions[marginKey] = (analysis.incorrectPredictions[marginKey] || 0) + 1;
          }
        }
      }
    }

    // Calculate final metrics
    analysis.accuracy = analysis.totalPredictions > 0 
      ? (analysis.correctPredictions / analysis.totalPredictions) * 100 
      : 0;
    analysis.averageConfidence = analysis.totalPredictions > 0 
      ? totalConfidence / analysis.totalPredictions 
      : 0;

    // Calculate accuracy by confidence range
    for (const range in analysis.performanceByConfidence) {
      const data = analysis.performanceByConfidence[range];
      data.accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    }

    // Calculate accuracy by spread range
    for (const range in analysis.performanceBySpread) {
      const data = analysis.performanceBySpread[range];
      data.accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    }

    // Print analysis results
    console.log('\nSpread Prediction Analysis (Last 30 Days):');
    console.log('=========================================');
    console.log(`Total Predictions: ${analysis.totalPredictions}`);
    console.log(`Overall Accuracy: ${analysis.accuracy.toFixed(1)}%`);
    console.log(`Pushes: ${analysis.pushes}`);
    console.log(`Average Confidence: ${analysis.averageConfidence.toFixed(2)}`);

    console.log('\nPerformance by Confidence Level:');
    console.log('-------------------------------');
    Object.entries(analysis.performanceByConfidence)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([range, data]) => {
        console.log(`${range}%: ${data.accuracy.toFixed(1)}% (${data.correct}/${data.total})`);
      });

    console.log('\nPerformance by Spread Size:');
    console.log('-------------------------');
    Object.entries(analysis.performanceBySpread)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .forEach(([range, data]) => {
        console.log(`${range}: ${data.accuracy.toFixed(1)}% (${data.correct}/${data.total})`);
      });

    console.log('\nIncorrect Predictions by Margin:');
    console.log('-----------------------------');
    Object.entries(analysis.incorrectPredictions)
      .sort(([a], [b]) => {
        const getValue = (key: string) => {
          if (key === '0.5 or less') return 0;
          return parseFloat(key.split('-')[0]);
        };
        return getValue(a) - getValue(b);
      })
      .forEach(([range, count]) => {
        console.log(`${range}: ${count}`);
      });

  } catch (error) {
    console.error('Error analyzing spread predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSpreadPredictions(); 