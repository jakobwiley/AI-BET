#!/usr/bin/env node

import { PrismaClient, SportType } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function showPredictions() {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get MLB games
    const mlbGames = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        predictions: true
      }
    });

    console.log('\n=== MLB Predictions for Today ===');
    console.log(`Found ${mlbGames.length} MLB games\n`);

    for (const game of mlbGames) {
      console.log(`${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Game Time: ${new Date(game.gameDate).toLocaleString()}`);
      
      if (game.predictions.length === 0) {
        console.log('No predictions available yet\n');
        continue;
      }

      // Group predictions by type
      const predictionsByType = game.predictions.reduce((acc, pred) => {
        if (!acc[pred.predictionType]) {
          acc[pred.predictionType] = [];
        }
        acc[pred.predictionType].push(pred);
        return acc;
      }, {} as Record<string, typeof game.predictions>);

      // Show predictions by type
      Object.entries(predictionsByType).forEach(([type, predictions]) => {
        console.log(`\n${type}:`);
        predictions.forEach(pred => {
          console.log(`  Value: ${pred.predictionValue}`);
          console.log(`  Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
          console.log(`  Outcome: ${pred.outcome}`);
          if (pred.reasoning) {
            console.log(`  Reasoning: ${pred.reasoning}`);
          }
        });
      });

      console.log('\n----------------------------------------\n');
    }

    // Get NBA games
    const nbaGames = await prisma.game.findMany({
      where: {
        sport: SportType.NBA,
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        predictions: true
      }
    });

    console.log('\n=== NBA Predictions for Today ===');
    console.log(`Found ${nbaGames.length} NBA games\n`);

    for (const game of nbaGames) {
      console.log(`${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Game Time: ${new Date(game.gameDate).toLocaleString()}`);
      
      if (game.predictions.length === 0) {
        console.log('No predictions available yet\n');
        continue;
      }

      // Group predictions by type
      const predictionsByType = game.predictions.reduce((acc, pred) => {
        if (!acc[pred.predictionType]) {
          acc[pred.predictionType] = [];
        }
        acc[pred.predictionType].push(pred);
        return acc;
      }, {} as Record<string, typeof game.predictions>);

      // Show predictions by type
      Object.entries(predictionsByType).forEach(([type, predictions]) => {
        console.log(`\n${type}:`);
        predictions.forEach(pred => {
          console.log(`  Value: ${pred.predictionValue}`);
          console.log(`  Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
          console.log(`  Outcome: ${pred.outcome}`);
          if (pred.reasoning) {
            console.log(`  Reasoning: ${pred.reasoning}`);
          }
        });
      });

      console.log('\n----------------------------------------\n');
    }

  } catch (error) {
    console.error('Error showing predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showPredictions().catch(console.error); 