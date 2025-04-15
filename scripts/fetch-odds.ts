#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { OddsApiService } from '../src/lib/oddsApi.ts';
import dotenv from 'dotenv';
import axios from 'axios';

const prisma = new PrismaClient();

// Configuration
const API_KEY = process.env.THE_ODDS_API_KEY;
const BASE_URL = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
const SPORT_KEYS = {
  MLB: 'baseball_mlb',
  NBA: 'basketball_nba'
};

async function fetchOddsForSport(sport: SportKey): Promise<TransformedOdds[]> {
  console.log(`Fetching odds for ${sport}...`);
  
  try {
    const sportKey = SPORT_KEYS[sport];
    const response = await axios.get<OddsResponse[]>(`${BASE_URL}/${sportKey}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'decimal',
        dateFormat: 'iso'
      }
    });
    
    if (!response.data || response.data.length === 0) {
      console.log(`No odds available for ${sport}`);
      return [];
    }
    
    return response.data
      .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
      .map((event) => {
        const bookmaker = event.bookmakers?.find(b => b.key === 'draftkings') || event.bookmakers?.[0];
        
        if (!bookmaker) {
          return {
            id: event.id,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            odds: {}
          };
        }
        
        const markets = bookmaker.markets;
        const h2hMarket = markets.find(m => m.key === 'h2h');
        const spreadsMarket = markets.find(m => m.key === 'spreads');
        const totalsMarket = markets.find(m => m.key === 'totals');
        
        const transformedOdds: TransformedOdds = {
          id: event.id,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          odds: {}
        };
        
        if (spreadsMarket?.outcomes?.length === 2) {
          transformedOdds.odds.spread = {
            homeSpread: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.point || 0,
            awaySpread: spreadsMarket.outcomes.find(o => o.name === event.away_team)?.point || 0,
            homeOdds: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.price || -110,
            awayOdds: spreadsMarket.outcomes.find(o => o.name === event.away_team)?.price || -110
          };
        }
        
        if (totalsMarket?.outcomes?.length === 2) {
          transformedOdds.odds.total = {
            overUnder: totalsMarket.outcomes[0]?.point || 0,
            overOdds: totalsMarket.outcomes.find(o => o.name === 'Over')?.price || -110,
            underOdds: totalsMarket.outcomes.find(o => o.name === 'Under')?.price || -110
          };
        }
        
        if (h2hMarket?.outcomes?.length === 2) {
          transformedOdds.odds.moneyline = {
            homeOdds: h2hMarket.outcomes.find(o => o.name === event.home_team)?.price || 0,
            awayOdds: h2hMarket.outcomes.find(o => o.name === event.away_team)?.price || 0
          };
        }
        
        return transformedOdds;
      });
    
  } catch (error) {
    console.error(`❌ Error fetching odds for ${sport}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function updateGameOdds(gameData) {
  if (gameData.noOdds) {
    console.log(`Skipping update for game ID ${gameData.id} (no odds available)`);
    return null;
  }
  
  try {
    // Check if game exists in our database
    const existingGame = await prisma.game.findUnique({
      where: { id: gameData.id }
    });
    
    if (!existingGame) {
      console.log(`Game not found in database: ${gameData.id} (${gameData.awayTeam} @ ${gameData.homeTeam})`);
      return null;
    }
    
    // Update the game with new odds
    const updatedGame = await prisma.game.update({
      where: { id: gameData.id },
      data: {
        oddsJson: gameData.odds
      }
    });
    
    console.log(`✅ Updated odds for ${gameData.awayTeam} @ ${gameData.homeTeam}`);
    
    // Log the structure of how odds are stored
    console.log(`  - Odds stored as:`, typeof updatedGame.oddsJson);
    if (updatedGame.oddsJson) {
      // Log a sample of the odds format
      const sample = JSON.stringify(updatedGame.oddsJson).substring(0, 100) + '...';
      console.log(`  - Sample: ${sample}`);
      
      // Log specific values
      if (updatedGame.oddsJson.spread) {
        console.log(`  - Spread: homeSpread=${updatedGame.oddsJson.spread.homeSpread}, homeOdds=${updatedGame.oddsJson.spread.homeOdds}`);
      }
      if (updatedGame.oddsJson.total) {
        console.log(`  - Total: overUnder=${updatedGame.oddsJson.total.overUnder}, overOdds=${updatedGame.oddsJson.total.overOdds}`);
      }
      if (updatedGame.oddsJson.moneyline) {
        console.log(`  - Moneyline: homeOdds=${updatedGame.oddsJson.moneyline.homeOdds}, awayOdds=${updatedGame.oddsJson.moneyline.awayOdds}`);
      }
    }
    
    return updatedGame;
  } catch (error) {
    console.error(`❌ Error updating game ${gameData.id}:`, error.message);
    return null;
  }
}

async function main() {
  if (!API_KEY) {
    console.error('❌ Error: THE_ODDS_API_KEY environment variable is not set.');
    process.exit(1);
  }
  
  console.log('🏀 🏈 ⚾ Starting odds refresh...');
  
  try {
    // Fetch odds for both sports in parallel
    const [mlbOdds, nbaOdds] = await Promise.all([
      fetchOddsForSport('MLB'),
      fetchOddsForSport('NBA')
    ]);
    
    const allGames = [...mlbOdds, ...nbaOdds];
    console.log(`Found odds for ${allGames.length} games in total.`);
    
    // Update database with fresh odds
    const updatePromises = allGames.map(game => updateGameOdds(game));
    const updateResults = await Promise.all(updatePromises);
    
    const successCount = updateResults.filter(Boolean).length;
    console.log(`✅ Successfully updated odds for ${successCount} games.`);
    
  } catch (error) {
    console.error('❌ Error in odds refresh process:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 