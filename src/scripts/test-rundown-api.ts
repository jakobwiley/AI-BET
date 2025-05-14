#!/usr/bin/env node

import { RundownApiService } from '../src/lib/rundownApi';
import { PrismaClient, SportType } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function testRundownApi() {
  try {
    console.log('Testing Rundown API...\n');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    console.log(`Fetching games for ${dateStr}\n`);
    
    // Get MLB games
    console.log('=== MLB Games ===');
    const mlbGames = await RundownApiService.getGamesByDate(dateStr, SportType.MLB);
    console.log(`Found ${mlbGames.length} MLB games for today\n`);
    
    for (const game of mlbGames) {
      const homeTeam = game.teams.find(team => team.is_home);
      const awayTeam = game.teams.find(team => team.is_away);
      
      if (!homeTeam || !awayTeam) {
        console.log('Error: Could not find home or away team');
        continue;
      }
      
      console.log(`Game: ${awayTeam.name} @ ${homeTeam.name}`);
      console.log(`Time: ${game.event_date}`);
      console.log('Status:', game.score?.event_status || 'Not Started');
      
      // Convert game to our format and save to database
      const convertedGame = RundownApiService.convertToGameFormat(game);
      const { oddsJson, ...gameData } = convertedGame;
      const gameId = convertedGame.id;
      await prisma.game.upsert({
        where: { id: gameId },
        update: {
          ...gameData,
          oddsJson: oddsJson as any
        },
        create: {
          ...gameData,
          oddsJson: oddsJson as any
        }
      });
      
      console.log('Game saved to database');
      console.log('---\n');
    }
    
    // Get NBA games
    console.log('=== NBA Games ===');
    const nbaGames = await RundownApiService.getGamesByDate(dateStr, SportType.NBA);
    console.log(`Found ${nbaGames.length} NBA games for today\n`);
    
    for (const game of nbaGames) {
      const homeTeam = game.teams.find(team => team.is_home);
      const awayTeam = game.teams.find(team => team.is_away);
      
      if (!homeTeam || !awayTeam) {
        console.log('Error: Could not find home or away team');
        continue;
      }
      
      console.log(`Game: ${awayTeam.name} @ ${homeTeam.name}`);
      console.log(`Time: ${game.event_date}`);
      console.log('Status:', game.score?.event_status || 'Not Started');
      
      // Convert game to our format and save to database
      const convertedGame = RundownApiService.convertToGameFormat(game);
      const { oddsJson, ...gameData } = convertedGame;
      const gameId = convertedGame.id;
      await prisma.game.upsert({
        where: { id: gameId },
        update: {
          ...gameData,
          oddsJson: oddsJson as any
        },
        create: {
          ...gameData,
          oddsJson: oddsJson as any
        }
      });
      
      console.log('Game saved to database');
      console.log('---\n');
    }
    
  } catch (error) {
    console.error('Error testing Rundown API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRundownApi()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });