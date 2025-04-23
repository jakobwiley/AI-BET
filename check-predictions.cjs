#!/usr/bin/env node

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

function calculateGrade(confidence) {
  if (confidence >= 0.90) return 'A+';
  if (confidence >= 0.85) return 'A';
  if (confidence >= 0.80) return 'A-';
  if (confidence >= 0.75) return 'B+';
  return 'C';
}

async function checkPredictions() {
  try {
    // Use 4/12/2025 since we have NBA games for that date
    const testDate = new Date('2025-04-12');
    testDate.setHours(0, 0, 0, 0);

    // Get the next day
    const nextDay = new Date(testDate);
    nextDay.setDate(nextDay.getDate() + 1);

    console.log(`Checking predictions for ${testDate.toLocaleDateString()}`);

    // Fetch NBA games with predictions for the test date
    const nbaGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: testDate,
          lt: nextDay
        },
        sport: 'NBA'
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${nbaGames.length} NBA games for ${testDate.toLocaleDateString()}`);

    if (nbaGames.length > 0) {
      console.log('\nNBA Games and Predictions:');
      nbaGames.forEach(game => {
        console.log(`\n${game.homeTeamName} vs ${game.awayTeamName}`);
        console.log(`Time: ${game.gameDate.toLocaleTimeString()}`);
        console.log(`Total predictions: ${game.predictions.length}`);
        
        // Group predictions by type
        const predictionsByType = {};
        game.predictions.forEach(pred => {
          if (!predictionsByType[pred.predictionType]) {
            predictionsByType[pred.predictionType] = [];
          }
          predictionsByType[pred.predictionType].push(pred);
        });

        // Show predictions by type
        Object.entries(predictionsByType).forEach(([type, predictions]) => {
          console.log(`\n${type} predictions:`);
          predictions.forEach(pred => {
            const grade = calculateGrade(pred.confidence);
            console.log(`  - Value: ${pred.predictionValue}, Confidence: ${(pred.confidence * 100).toFixed(1)}%, Grade: ${grade}`);
          });
        });

        // Show odds if available
        if (game.oddsJson) {
          console.log('\nOdds:');
          console.log(JSON.stringify(game.oddsJson, null, 2));
        }
      });
    }

    // Also check MLB games for comparison
    const mlbGames = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: testDate,
          lt: nextDay
        },
        sport: 'MLB'
      },
      include: {
        predictions: true
      }
    });

    console.log(`\nFound ${mlbGames.length} MLB games for ${testDate.toLocaleDateString()}`);
  } catch (error) {
    console.error('Error checking predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkPredictions(); 