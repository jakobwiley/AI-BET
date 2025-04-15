#!/usr/bin/env node

// Script to generate predictions for all games in the database
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Make sure environment variables are loaded
dotenv.config();

const prisma = new PrismaClient();

async function generateAllPredictions() {
  try {
    console.log('🔍 Finding all games without predictions...');
    
    // Get all games without predictions
    const games = await prisma.game.findMany({
      include: {
        predictions: true
      }
    });
    
    console.log(`📊 Found ${games.length} total games in database.`);
    
    // Filter to games without predictions
    const gamesWithoutPredictions = games.filter(game => !game.predictions || game.predictions.length === 0);
    console.log(`🎯 Found ${gamesWithoutPredictions.length} games without predictions.`);
    
    if (gamesWithoutPredictions.length === 0) {
      console.log('✅ All games already have predictions!');
      return;
    }
    
    // Use the enhanced analyzer to generate predictions
    console.log('🔄 Generating predictions using enhanced analyzer...');
    
    // Insert code to call the API endpoint for each game to trigger prediction generation
    for (const game of gamesWithoutPredictions) {
      try {
        console.log(`🎲 Generating predictions for game: ${game.id} (${game.homeTeamName} vs ${game.awayTeamName})`);
        
        // Call the API endpoint to generate predictions
        const result = execSync(`curl -X GET "http://localhost:3000/api/predictions?gameId=${game.id}" -H "Content-Type: application/json"`, {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        console.log(`✅ Successfully generated predictions for game: ${game.id}`);
      } catch (error) {
        console.error(`❌ Error generating predictions for game ${game.id}:`, error.message);
      }
    }
    
    console.log('✅ Finished generating predictions!');
  } catch (error) {
    console.error('❌ Error in generateAllPredictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
generateAllPredictions().catch(e => {
  console.error('Unhandled error:', e);
  process.exit(1);
}); 