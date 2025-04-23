#!/usr/bin/env node

import { PrismaClient, GameStatus } from '@prisma/client';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkOdds() {
  try {
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        },
        status: GameStatus.SCHEDULED
      }
    });

    console.log(`\nGames for ${format(new Date(), 'MMMM d, yyyy')}:\n`);
    
    games.forEach(game => {
      console.log(`${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Time: ${format(new Date(game.gameDate), 'h:mm a')}`);
      
      try {
        const odds = typeof game.oddsJson === 'string' 
          ? JSON.parse(game.oddsJson) 
          : game.oddsJson;

        if (odds) {
          if (odds.moneyline) {
            console.log(`Moneyline: ${game.awayTeamName} ${odds.moneyline.away > 0 ? '+' : ''}${odds.moneyline.away} | ${game.homeTeamName} ${odds.moneyline.home > 0 ? '+' : ''}${odds.moneyline.home}`);
          }
          if (odds.spread) {
            console.log(`Spread: ${game.awayTeamName} ${odds.spread.away > 0 ? '+' : ''}${odds.spread.away} (${odds.spread.point > 0 ? '+' : ''}${odds.spread.point}) | ${game.homeTeamName} ${odds.spread.home > 0 ? '+' : ''}${odds.spread.home} (${-odds.spread.point > 0 ? '+' : ''}${-odds.spread.point})`);
          }
          if (odds.total) {
            console.log(`Total: O/U ${odds.total.over} (O: ${odds.total.point > 0 ? '+' : ''}${odds.total.point} | U: ${odds.total.under > 0 ? '+' : ''}${odds.total.under})`);
          }
        } else {
          console.log('No odds available');
        }
      } catch (error) {
        console.error(`Error parsing odds for game ${game.id}:`, error);
      }
      
      console.log('-------------------\n');
    });

  } catch (error) {
    console.error('Error checking odds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOdds(); 