#!/usr/bin/env node

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkOdds() {
  try {
    // Get today's MLB games with odds
    const startDate = new Date('2025-04-24T05:00:00.000Z');
    const endDate = new Date('2025-04-25T05:00:00.000Z');
    
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: startDate,
          lt: endDate
        }
      },
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        oddsJson: true
      }
    });

    console.log(`Found ${games.length} MLB games for today`);
    
    // Analyze odds format for each game
    games.forEach(game => {
      console.log(`\n${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log('----------------------------------------');
      
      if (game.oddsJson) {
        const odds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
        console.log('Raw odds data:', JSON.stringify(odds, null, 2));
        
        // Check odds structure
        if (typeof odds === 'object') {
          console.log('\nOdds structure:');
          Object.keys(odds).forEach(key => {
            console.log(`- ${key}: ${typeof odds[key]}`);
            if (typeof odds[key] === 'object') {
              Object.keys(odds[key]).forEach(subKey => {
                console.log(`  - ${subKey}: ${typeof odds[key][subKey]}`);
              });
            }
          });
        }
      } else {
        console.log('No odds data available');
      }
    });
  } catch (error) {
    console.error('Error checking odds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOdds(); 