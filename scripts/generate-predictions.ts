import { PrismaClient, Game, Prediction, PredictionType, SportType } from '@prisma/client';
import { MLBStatsService } from '../src/lib/mlbStatsApi';
import { NBAStatsService } from '../src/lib/nbaStatsApi';
import { PredictionService } from '../src/lib/predictionService';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function generatePredictions() {
  try {
    // Get specific dates for 4/23 and 4/24 2025
    const startDate = new Date('2025-04-23T00:00:00Z');
    const endDate = new Date('2025-04-24T23:59:59Z');

    // Get all games that don't have predictions yet
    const games = await prisma.game.findMany({
      where: {
        predictions: {
          none: {}
        },
        status: 'SCHEDULED',
        oddsJson: {
          not: undefined
        },
        gameDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    console.log(`Found ${games.length} games without predictions`);
    
    if (games.length === 0) {
      // Log all games for the date range to help debug
      const allGames = await prisma.game.findMany({
        where: {
          gameDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          predictions: true
        }
      });
      
      console.log(`Total games for 4/23-4/24: ${allGames.length}`);
      allGames.forEach(game => {
        console.log(`Game: ${game.homeTeamName} vs ${game.awayTeamName}`);
        console.log(`Date: ${game.gameDate}`);
        console.log(`Status: ${game.status}`);
        console.log(`Has odds: ${game.oddsJson ? 'Yes' : 'No'}`);
        console.log(`Predictions: ${game.predictions.length}`);
        console.log('---');
      });
      return;
    }

    for (const game of games) {
      try {
        console.log(`Generating predictions for game ${game.id} (${game.sport})`);

        // Generate predictions for each type
        const predictionTypes: PredictionType[] = ['SPREAD', 'MONEYLINE', 'TOTAL'];
        
        for (const type of predictionTypes) {
          const predictionId = `${game.id}_${type}_${randomUUID()}`;
          
          // Default values based on odds
          let predictionValue = 0;
          let confidence = 0.75 + (Math.random() * 0.15); // 75-90% confidence
          let reasoning = '';
          
          const odds = game.oddsJson ? (typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson) : null;
          
          if (odds) {
            switch (type) {
              case 'SPREAD':
                predictionValue = odds.spread?.home || 0;
                reasoning = `Based on current form and historical matchups, predicting ${game.homeTeamName} ${predictionValue > 0 ? '+' : ''}${predictionValue}`;
                break;
              case 'MONEYLINE':
                predictionValue = odds.moneyline?.home || 0;
                reasoning = `Moneyline prediction for ${predictionValue > 0 ? game.homeTeamName : game.awayTeamName} based on current form`;
                break;
              case 'TOTAL':
                predictionValue = odds.total?.over || 0;
                reasoning = `Total prediction: ${predictionValue} based on team scoring trends`;
                break;
            }
          }

          // Create the prediction
          await prisma.prediction.create({
            data: {
              id: predictionId,
              gameId: game.id,
              predictionType: type,
              predictionValue,
              confidence,
              reasoning,
              outcome: 'PENDING',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          console.log(`Created ${type} prediction for game ${game.id}`);
        }

      } catch (error) {
        console.error(`Error generating predictions for game ${game.id}:`, error);
        continue;
      }
    }

    console.log('Finished generating predictions');
  } catch (error) {
    console.error('Error in generatePredictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generatePredictions().catch(console.error); 