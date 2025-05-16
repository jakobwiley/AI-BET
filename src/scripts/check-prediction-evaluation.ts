import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPredictionEvaluation() {
  try {
    console.log('🔍 Checking prediction evaluations...');

    // Get some recent games with predictions
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        status: GameStatus.FINAL,
        predictions: {
          some: {}
        }
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'desc'
      },
      take: 10 // Look at 10 most recent games
    });

    console.log(`\nAnalyzing ${games.length} recent games...\n`);

    for (const game of games) {
      console.log(`\nGame: ${game.homeTeamName} vs ${game.awayTeamName}`);
      console.log(`Score: ${game.homeScore}-${game.awayScore}`);
      console.log(`Date: ${game.gameDate}`);

      for (const prediction of game.predictions) {
        console.log(`\nPrediction Type: ${prediction.predictionType}`);
        console.log(`Prediction Value: ${prediction.predictionValue}`);
        console.log(`Confidence: ${prediction.confidence}`);
        console.log(`Current Outcome: ${prediction.outcome}`);

        // Re-evaluate the prediction
        let expectedOutcome = prediction.outcome;

        switch (prediction.predictionType) {
          case 'MONEYLINE': {
            const value = prediction.predictionValue.trim();
            const homeWon = game.homeScore > game.awayScore;
            const awayWon = game.awayScore > game.homeScore;
            
            if (!homeWon && !awayWon) {
              expectedOutcome = PredictionOutcome.PUSH;
            } else if (/^-?\d+$/.test(value)) {
              const mlValue = parseFloat(value);
              if (mlValue < 0) {
                expectedOutcome = homeWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else {
                expectedOutcome = awayWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
            } else {
              if (value === game.homeTeamName || value === game.homeTeamId) {
                expectedOutcome = homeWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else if (value === game.awayTeamName || value === game.awayTeamId) {
                expectedOutcome = awayWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
            }
            break;
          }
          case 'SPREAD': {
            const value = prediction.predictionValue.trim();
            let spreadValue = NaN;
            
            if (/^[+-]?\d+(\.\d+)?$/.test(value)) {
              spreadValue = parseFloat(value);
            } else {
              const match = value.match(/^[+-](.+?)\s+([+-]?\d+(\.\d+)?)/);
              if (match) {
                const team = match[1].trim();
                const spread = parseFloat(match[2]);
                if (team === game.awayTeamName || team === game.awayTeamId) {
                  spreadValue = -spread;
                } else {
                  spreadValue = spread;
                }
              }
            }

            if (!isNaN(spreadValue)) {
              const homeScoreWithSpread = game.homeScore + spreadValue;
              if (homeScoreWithSpread === game.awayScore) {
                expectedOutcome = PredictionOutcome.PUSH;
              } else {
                expectedOutcome = homeScoreWithSpread > game.awayScore ? 
                  PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
            }
            break;
          }
          case 'TOTAL': {
            const value = prediction.predictionValue.trim();
            let totalValue = NaN;
            let isOver = null;

            // Try different patterns
            const patterns = [
              { pattern: /^(Over|Under)\s+(\d+\.?\d*)$/i, 
                extract: (match: RegExpMatchArray) => ({
                  isOver: match[1].toLowerCase() === 'over',
                  value: parseFloat(match[2])
                })
              },
              { pattern: /^[OU]\s+(\d+\.?\d*)$/i,
                extract: (match: RegExpMatchArray) => ({
                  isOver: match[0][0].toLowerCase() === 'o',
                  value: parseFloat(match[1])
                })
              },
              { pattern: /^[ou](\d+\.?\d*)$/i,
                extract: (match: RegExpMatchArray) => ({
                  isOver: match[0][0].toLowerCase() === 'o',
                  value: parseFloat(match[1])
                })
              }
            ];

            for (const { pattern, extract } of patterns) {
              const match = value.match(pattern);
              if (match) {
                const result = extract(match);
                totalValue = result.value;
                isOver = result.isOver;
                break;
              }
            }

            if (!isNaN(totalValue) && isOver !== null) {
              const totalScore = game.homeScore + game.awayScore;
              if (totalScore === totalValue) {
                expectedOutcome = PredictionOutcome.PUSH;
              } else if (isOver) {
                expectedOutcome = totalScore > totalValue ? 
                  PredictionOutcome.WIN : PredictionOutcome.LOSS;
              } else {
                expectedOutcome = totalScore < totalValue ? 
                  PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
            }
            break;
          }
        }

        console.log(`Expected Outcome: ${expectedOutcome}`);
        console.log(`Match: ${expectedOutcome === prediction.outcome ? '✅' : '❌'}`);
        
        if (expectedOutcome !== prediction.outcome) {
          console.log('⚠️ Mismatch detected!');
        }
      }
    }

  } catch (error) {
    console.error('Error checking prediction evaluations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkPredictionEvaluation(); 