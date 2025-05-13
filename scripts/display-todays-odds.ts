import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function displayTodaysOdds() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get MLB games
    console.log('\n=== MLB Games ===\n');
    const mlbGames = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    for (const game of mlbGames) {
      const odds = game.oddsJson as any;
      console.log(`${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Start Time: ${new Date(game.gameDate).toLocaleTimeString()}`);
      if (odds?.moneyline) {
        console.log(`Moneyline: ${game.awayTeamName} ${odds.moneyline.away > 0 ? '+' : ''}${odds.moneyline.away} | ${game.homeTeamName} ${odds.moneyline.home > 0 ? '+' : ''}${odds.moneyline.home}`);
      }
      if (odds?.spread) {
        console.log(`Spread: ${game.awayTeamName} ${odds.spread.away > 0 ? '+' : ''}${odds.spread.away} (${odds.spread.point > 0 ? '+' : ''}${odds.spread.point}) | ${game.homeTeamName} ${odds.spread.home > 0 ? '+' : ''}${odds.spread.home} (${odds.spread.point > 0 ? '+' : ''}${odds.spread.point})`);
      }
      if (odds?.total) {
        console.log(`Total: O/U ${odds.total.over} (${odds.total.point > 0 ? '+' : ''}${odds.total.point})`);
      }
      console.log('---');
    }

    // Get NBA games
    console.log('\n=== NBA Games ===\n');
    const nbaGames = await prisma.game.findMany({
      where: {
        sport: 'NBA',
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    for (const game of nbaGames) {
      const odds = game.oddsJson as any;
      console.log(`${game.awayTeamName} @ ${game.homeTeamName}`);
      console.log(`Start Time: ${new Date(game.gameDate).toLocaleTimeString()}`);
      if (odds?.moneyline) {
        console.log(`Moneyline: ${game.awayTeamName} ${odds.moneyline.away > 0 ? '+' : ''}${odds.moneyline.away} | ${game.homeTeamName} ${odds.moneyline.home > 0 ? '+' : ''}${odds.moneyline.home}`);
      }
      if (odds?.spread) {
        console.log(`Spread: ${game.awayTeamName} ${odds.spread.away > 0 ? '+' : ''}${odds.spread.away} (${odds.spread.point > 0 ? '+' : ''}${odds.spread.point}) | ${game.homeTeamName} ${odds.spread.home > 0 ? '+' : ''}${odds.spread.home} (${odds.spread.point > 0 ? '+' : ''}${odds.spread.point})`);
      }
      if (odds?.total) {
        console.log(`Total: O/U ${odds.total.over} (${odds.total.point > 0 ? '+' : ''}${odds.total.point})`);
      }
      console.log('---');
    }

  } catch (error) {
    console.error('Error displaying odds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

displayTodaysOdds().catch(console.error); 