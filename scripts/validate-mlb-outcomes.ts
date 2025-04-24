import { PrismaClient, PredictionType, PredictionOutcome, GameStatus, SportType } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

interface GameValidation {
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  predictions: {
    id: string;
    type: PredictionType;
    value: number;
    currentOutcome: PredictionOutcome;
    calculatedOutcome: PredictionOutcome;
    details: string;
  }[];
}

async function validateMlbOutcomes() {
  try {
    console.log('🔍 Starting MLB prediction outcome validation...');

    // Get all MLB games with final status and their predictions
    const games = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        status: GameStatus.FINAL,
        gameDate: {
          lt: new Date('2025-04-23') // Only games before today
        },
        predictions: {
          some: {} // Only games with predictions
        }
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    console.log(`Found ${games.length} completed MLB games with predictions to validate`);

    const validations: GameValidation[] = [];
    let mismatchCount = 0;

    for (const game of games) {
      const gameValidation: GameValidation = {
        gameId: game.id,
        date: format(game.gameDate, 'yyyy-MM-dd'),
        homeTeam: game.homeTeamName,
        awayTeam: game.awayTeamName,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        predictions: []
      };

      if (game.homeScore === null || game.awayScore === null) {
        console.log(`⚠️ Game ${game.id} (${game.homeTeamName} vs ${game.awayTeamName}) has null scores`);
        continue;
      }

      const homeWon = game.homeScore > game.awayScore;
      const awayWon = game.awayScore > game.homeScore;
      const totalScore = game.homeScore + game.awayScore;

      for (const prediction of game.predictions) {
        let calculatedOutcome = prediction.outcome;
        let details = '';

        switch (prediction.predictionType) {
          case 'MONEYLINE':
            details = `ML: ${prediction.predictionValue}, `;
            if (prediction.predictionValue < 0) { // Betting on home team
              calculatedOutcome = homeWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              details += `Bet on ${game.homeTeamName} (home) to win`;
            } else { // Betting on away team
              calculatedOutcome = awayWon ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              details += `Bet on ${game.awayTeamName} (away) to win`;
            }
            details += `, Final: ${game.homeTeamName} ${game.homeScore}-${game.awayScore} ${game.awayTeamName}`;
            break;

          case 'SPREAD':
            const homeScoreWithSpread = game.homeScore + prediction.predictionValue;
            calculatedOutcome = homeScoreWithSpread > game.awayScore ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
            details = `Spread: ${prediction.predictionValue > 0 ? '+' : ''}${prediction.predictionValue} ${game.homeTeamName}, ` +
                     `Adjusted score: ${homeScoreWithSpread}-${game.awayScore}`;
            break;

          case 'TOTAL':
            details = `Total: ${Math.abs(prediction.predictionValue)}, Actual: ${totalScore}, `;
            if (prediction.predictionValue > 0) { // Betting over
              calculatedOutcome = totalScore > prediction.predictionValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              details += `Bet OVER ${prediction.predictionValue}`;
            } else { // Betting under
              calculatedOutcome = totalScore < Math.abs(prediction.predictionValue) ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
              details += `Bet UNDER ${Math.abs(prediction.predictionValue)}`;
            }
            break;
        }

        if (calculatedOutcome !== prediction.outcome) {
          mismatchCount++;
          console.log(`\n⚠️ Outcome mismatch for prediction ${prediction.id}:`);
          console.log(`Game: ${game.homeTeamName} vs ${game.awayTeamName} (${format(game.gameDate, 'yyyy-MM-dd')})`);
          console.log(`Type: ${prediction.predictionType}`);
          console.log(`Current outcome: ${prediction.outcome}`);
          console.log(`Calculated outcome: ${calculatedOutcome}`);
          console.log(`Details: ${details}`);
        }

        gameValidation.predictions.push({
          id: prediction.id,
          type: prediction.predictionType,
          value: prediction.predictionValue,
          currentOutcome: prediction.outcome,
          calculatedOutcome,
          details
        });
      }

      validations.push(gameValidation);
    }

    // Print summary
    console.log('\n📊 Validation Summary:');
    console.log(`Total games validated: ${games.length}`);
    console.log(`Total outcome mismatches found: ${mismatchCount}`);

    // Print detailed game-by-game report
    console.log('\n📋 Detailed Game Report:');
    validations.forEach(validation => {
      console.log(`\nGame: ${validation.homeTeam} vs ${validation.awayTeam} (${validation.date})`);
      console.log(`Score: ${validation.homeScore}-${validation.awayScore}`);
      validation.predictions.forEach(pred => {
        const mismatch = pred.currentOutcome !== pred.calculatedOutcome ? '⚠️ ' : '✓ ';
        console.log(`${mismatch}${pred.type}: ${pred.details}`);
        if (pred.currentOutcome !== pred.calculatedOutcome) {
          console.log(`  Current: ${pred.currentOutcome}, Calculated: ${pred.calculatedOutcome}`);
        }
      });
    });

    // If there are mismatches, offer to fix them
    if (mismatchCount > 0) {
      console.log('\n🔧 Would you like to fix these mismatches? Run the fix-mlb-predictions.ts script.');
    }

  } catch (error) {
    console.error('Error validating MLB prediction outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the validation
validateMlbOutcomes(); 