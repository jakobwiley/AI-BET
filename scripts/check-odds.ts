#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkOdds() {
  try {
    const game = await prisma.game.findFirst({
      where: { sport: 'MLB' }
    });

    console.log('Game:', {
      id: game?.id,
      homeTeam: game?.homeTeamName,
      awayTeam: game?.awayTeamName,
      odds: game?.oddsJson
    });

  } catch (error) {
    console.error('Error checking odds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOdds().catch(console.error); 