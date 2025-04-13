#!/usr/bin/env node

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function checkGames() {
  try {
    // Check for any NBA games in the database
    const nbaGames = await prisma.game.findMany({
      where: {
        sport: 'NBA'
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${nbaGames.length} NBA games in the database`);

    if (nbaGames.length > 0) {
      // Group games by date
      const gamesByDate = {};
      nbaGames.forEach(game => {
        const date = game.gameDate.toISOString().split('T')[0];
        if (!gamesByDate[date]) {
          gamesByDate[date] = [];
        }
        gamesByDate[date].push(game);
      });

      // Display games by date
      console.log('\nNBA Games by date:');
      Object.keys(gamesByDate).sort().forEach(date => {
        console.log(`\n${date}: ${gamesByDate[date].length} games`);
        gamesByDate[date].forEach(game => {
          console.log(`  ${game.homeTeamName} vs ${game.awayTeamName} - ${game.predictions.length} predictions`);
        });
      });
    }
  } catch (error) {
    console.error('Error checking games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkGames(); 