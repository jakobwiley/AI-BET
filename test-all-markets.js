// Script to test fetching all betting markets for NBA and MLB games
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';

async function getAllMarkets(sport) {
  console.log(`\n\n=== Fetching ${sport} games with all markets ===`);
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 'Missing');
  console.log('API Host:', API_HOST);
  
  if (!API_KEY) {
    console.error('API key is not defined. Please check your environment variables.');
    return false;
  }
  
  try {
    // Make request to get games with all markets
    const sportKey = sport === 'NBA' ? 'basketball_nba' : 'baseball_mlb';
    const url = `${API_HOST}/sports/${sportKey}/odds`;
    const queryParams = {
      apiKey: API_KEY,
      regions: 'us',
      markets: 'h2h,spreads,totals',
      oddsFormat: 'american',
      bookmakers: 'draftkings'
    };

    console.log(`Making request to: ${url}`);
    console.log('Query params:', JSON.stringify(queryParams, null, 2));
    
    const response = await axios({
      method: 'GET',
      url,
      params: queryParams
    });

    console.log(`Request successful! Response status: ${response.status}`);
    console.log(`Found ${response.data.length} ${sport} games:`);
    
    if (response.data.length === 0) {
      console.log(`No ${sport} games found for today.`);
      return true;
    }
    
    response.data.forEach(game => {
      console.log(`\n${game.away_team} @ ${game.home_team}`);
      console.log(`Game time: ${new Date(game.commence_time).toLocaleString()}`);
      
      if (game.bookmakers && game.bookmakers.length > 0) {
        const bookmaker = game.bookmakers[0];
        console.log(`Bookmaker: ${bookmaker.title}`);
        
        // Check for h2h (moneyline) odds
        const h2h = bookmaker.markets.find(m => m.key === 'h2h');
        if (h2h) {
          console.log('Moneyline (h2h):');
          h2h.outcomes.forEach(outcome => {
            console.log(`  ${outcome.name}: ${outcome.price > 0 ? '+' : ''}${outcome.price}`);
          });
        } else {
          console.log('No moneyline (h2h) odds available');
        }
        
        // Check for spreads
        const spreads = bookmaker.markets.find(m => m.key === 'spreads');
        if (spreads) {
          console.log('Spread:');
          spreads.outcomes.forEach(outcome => {
            console.log(`  ${outcome.name}: ${outcome.point > 0 ? '+' : ''}${outcome.point} (${outcome.price > 0 ? '+' : ''}${outcome.price})`);
          });
        } else {
          console.log('No spread odds available');
        }
        
        // Check for totals
        const totals = bookmaker.markets.find(m => m.key === 'totals');
        if (totals) {
          console.log('Totals (Over/Under):');
          totals.outcomes.forEach(outcome => {
            console.log(`  ${outcome.name}: ${outcome.point} (${outcome.price > 0 ? '+' : ''}${outcome.price})`);
          });
        } else {
          console.log('No totals (over/under) odds available');
        }
      } else {
        console.log('No bookmaker data available');
      }
    });
    
    return true;
  } catch (error) {
    console.error('Request failed:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    
    return false;
  }
}

async function testAllMarkets() {
  await getAllMarkets('NBA');
  await getAllMarkets('MLB');
}

testAllMarkets(); 