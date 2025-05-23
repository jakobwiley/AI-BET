import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMlbPredictions() {
  try {
    console.log('🔄 Starting MLB prediction fixes...');

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

    let fixedConfidenceCount = 0;
    let fixedOutcomeCount = 0;

    for (const game of games) {
      for (const prediction of game.predictions) {
        let shouldUpdate = false;
        const updates: any = {};

        // Fix confidence values
        if (prediction.confidence > 1) {
          updates.confidence = prediction.confidence / 100;
          fixedConfidenceCount++;
          shouldUpdate = true;
        }

        // Fix prediction outcomes
        if (game.homeScore !== null && game.awayScore !== null) {
          const currentOutcome = prediction.outcome;
          let newOutcome = currentOutcome;

          switch (prediction.predictionType) {
            case 'MONEYLINE': {
              // Support both numeric odds and team name/id formats
              const value = prediction.predictionValue.trim();
              const homeWon = game.homeScore > game.awayScore;
              const awayWon = game.awayScore > game.homeScore;
              if (!homeWon && !awayWon) {
                newOutcome = PredictionOutcome.PUSH;
                break;
              }
              // Numeric odds (e.g., -110 for home, +120 for away)
              if (/^-?\d+$/.test(value)) {
                const mlValue = parseFloat(value);
                if (mlValue < 0) {
                  newOutcome = homeWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                } else {
                  newOutcome = awayWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                }
              } else {
                // Team name or id
                if (
                  value === game.homeTeamName ||
                  value === game.homeTeamId
                ) {
                  newOutcome = homeWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                } else if (
                  value === game.awayTeamName ||
                  value === game.awayTeamId
                ) {
                  newOutcome = awayWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                } else {
                  // Unknown format, fallback to LOSS
                  newOutcome = PredictionOutcome.LOSS;
                }
              }
              break;
            }
            case 'SPREAD': {
              // Support both +/-X.X and "+TeamName X.X" formats
              const value = prediction.predictionValue.trim();
              let spreadValue = NaN;
              if (/^[+-]?\d+(\.\d+)?$/.test(value)) {
                spreadValue = parseFloat(value);
              } else {
                // Try to extract from "+TeamName X.X" or "-TeamName X.X"
                const match = value.match(/^[+-](.+?)\s+([+-]?\d+(\.\d+)?)/);
                if (match) {
                  const team = match[1].trim();
                  const spread = parseFloat(match[2]);
                  // If predicted team is away, flip the sign
                  if (team === game.awayTeamName || team === game.awayTeamId) {
                    spreadValue = -spread;
                  } else {
                    spreadValue = spread;
                  }
                }
              }
              if (isNaN(spreadValue)) {
                newOutcome = PredictionOutcome.PENDING;
                break;
              }
              const homeScoreWithSpread = game.homeScore + spreadValue;
              if (homeScoreWithSpread === game.awayScore) {
                newOutcome = PredictionOutcome.PUSH;
              } else {
                newOutcome = homeScoreWithSpread > game.awayScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              }
              break;
            }
            case 'TOTAL': {
              // Support various formats: "Over X.X", "Under X.X", "oX.X", "uX.X", "O X.X", "U X.X", and just a number
              const value = prediction.predictionValue.trim();
              console.log(`DEBUG: TOTAL predictionValue: '${value}' for prediction id ${prediction.id}`);
              let totalValue = NaN;
              let isOver = null; // Don't default to any value

              // Try different patterns in order of specificity
              const patterns = [
                // "Over X.X" or "Under X.X" with space
                { pattern: /^(Over|Under)\s+(\d+\.?\d*)$/i, 
                  extract: (match: RegExpMatchArray) => ({
                    isOver: match[1].toLowerCase() === 'over',
                    value: parseFloat(match[2])
                  })
                },
                // "O X.X" or "U X.X" with space
                { pattern: /^[OU]\s+(\d+\.?\d*)$/i,
                  extract: (match: RegExpMatchArray) => ({
                    isOver: match[0][0].toLowerCase() === 'o',
                    value: parseFloat(match[1])
                  })
                },
                // "oX.X" or "uX.X" without space
                { pattern: /^[ou](\d+\.?\d*)$/i,
                  extract: (match: RegExpMatchArray) => ({
                    isOver: match[0][0].toLowerCase() === 'o',
                    value: parseFloat(match[1])
                  })
                },
                // Just a number (require explicit format)
                { pattern: /^(\d+\.?\d*)$/,
                  extract: (match: RegExpMatchArray) => ({
                    isOver: null, // Don't assume direction
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
                  console.log(`DEBUG: Parsed ${pattern}: isOver=${isOver}, totalValue=${totalValue}`);
                  break;
                }
              }

              // Validate the total value
              if (isNaN(totalValue) || totalValue < 0 || totalValue > 30) {
                console.log(`DEBUG: Invalid total value: ${totalValue} for prediction id ${prediction.id}`);
                newOutcome = PredictionOutcome.PENDING;
                break;
              }

              // If we have a number but no direction, we can't determine the outcome
              if (isOver === null) {
                console.log(`DEBUG: Missing direction for total value: ${totalValue} for prediction id ${prediction.id}`);
                newOutcome = PredictionOutcome.PENDING;
                break;
              }

              const totalScore = game.homeScore + game.awayScore;
              
              // Handle half-point totals
              if (totalValue % 1 === 0.5) {
                if (totalScore === totalValue) {
                  newOutcome = PredictionOutcome.PUSH;
                } else if (isOver) {
                  newOutcome = totalScore > totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                } else {
                  newOutcome = totalScore < totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                }
              } else {
                // For whole number totals, handle pushes correctly
                if (totalScore === totalValue) {
                  newOutcome = PredictionOutcome.PUSH;
                } else if (isOver) {
                  newOutcome = totalScore > totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                } else {
                  newOutcome = totalScore < totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
                }
              }
              break;
            }
          }

          if (newOutcome !== currentOutcome) {
            updates.outcome = newOutcome;
            fixedOutcomeCount++;
            shouldUpdate = true;
          }
        }

        // Update prediction if needed
        if (shouldUpdate) {
          await prisma.prediction.update({
            where: { id: prediction.id },
            data: updates
          });
        }
      }
    }

    console.log('\n📊 Fix Summary:');
    console.log(`Fixed ${fixedConfidenceCount} confidence values`);
    console.log(`Fixed ${fixedOutcomeCount} prediction outcomes`);

  } catch (error) {
    console.error('Error fixing MLB predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fixes