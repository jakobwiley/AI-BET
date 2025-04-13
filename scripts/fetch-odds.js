#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const API_KEY = process.env.THE_ODDS_API_KEY;
const BASE_URL = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
const SPORT_KEYS = {
  MLB: 'baseball_mlb',
  NBA: 'basketball_nba'
};

async function fetchOddsForSport(sport) {
  console.log(`Fetching odds for ${sport}...`);
  
  try {
    const sportKey = SPORT_KEYS[sport];
    const response = await axios.get(`${BASE_URL}/sports/${sportKey}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us',
        markets: 'spreads,totals,h2h',
        oddsFormat: 'american',
        bookmakers: 'draftkings',
        dateFormat: 'iso'
      }
    });
    
    console.log(`✅ Received ${response.data.length} ${sport} games from API`);
    
    // Transform and return the events with odds
    return response.data.map(event => {
      // Generate consistent game ID with sport prefix
      const sportPrefix = sport.toLowerCase();
      const gameId = `${sportPrefix}-game-${event.id}`;
      
      // Look for DraftKings odds
      const bookmaker = event.bookmakers?.find(b => b.key === 'draftkings') || event.bookmakers?.[0];
      
      if (!bookmaker) {
        console.log(`⚠️ No odds data for game: ${event.home_team} vs ${event.away_team}`);
        return {
          id: gameId,
          noOdds: true
        };
      }
      
      const markets = bookmaker.markets;
      const h2hMarket = markets.find(m => m.key === 'h2h');
      const spreadsMarket = markets.find(m => m.key === 'spreads');
      const totalsMarket = markets.find(m => m.key === 'totals');
      
      // Construct odds object
      const odds = {
        spread: spreadsMarket?.outcomes?.length === 2 ? {
          homeSpread: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.point || 0,
          awaySpread: spreadsMarket.outcomes.find(o => o.name === event.away_team)?.point || 0,
          homeOdds: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.price || -110,
          awayOdds: spreadsMarket.outcomes.find(o => o.name === event.away_team)?.price || -110
        } : undefined,
        total: totalsMarket?.outcomes?.length === 2 ? {
          overUnder: totalsMarket.outcomes[0]?.point || 0,
          overOdds: totalsMarket.outcomes.find(o => o.name === 'Over')?.price || -110,
          underOdds: totalsMarket.outcomes.find(o => o.name === 'Under')?.price || -110
        } : undefined,
        moneyline: h2hMarket?.outcomes?.length === 2 ? {
          homeOdds: h2hMarket.outcomes.find(o => o.name === event.home_team)?.price || 0,
          awayOdds: h2hMarket.outcomes.find(o => o.name === event.away_team)?.price || 0
        } : undefined
      };
      
      return {
        id: gameId,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        odds
      };
    });
    
  } catch (error) {
    console.error(`❌ Error fetching ${sport} odds:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
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