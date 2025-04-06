// Script to test fetching MLB games data
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';

async function getMLBGames() {
  console.log('Fetching MLB games...');
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 'Missing');
  console.log('API Host:', API_HOST);
  
  if (!API_KEY) {
    console.error('API key is not defined. Please check your environment variables.');
    return false;
  }
  
  try {
    // Make request to get MLB games
    const url = `${API_HOST}/sports/baseball_mlb/odds`;
    const queryParams = {
      apiKey: API_KEY,
      regions: 'us',
      markets: 'spreads,totals,h2h',
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
    console.log(`Found ${response.data.length} MLB games:`);
    
    if (response.data.length === 0) {
      console.log('No MLB games found for today.');
      return true;
    }
    
    response.data.forEach(game => {
      console.log(`\n${game.away_team} @ ${game.home_team}`);
      console.log(`Game time: ${new Date(game.commence_time).toLocaleString()}`);
      
      if (game.bookmakers && game.bookmakers.length > 0) {
        console.log('Bookmakers:', game.bookmakers.map(b => b.title).join(', '));
        
        const spreads = game.bookmakers[0].markets.find(m => m.key === 'spreads');
        if (spreads) {
          const homeSpread = spreads.outcomes.find(o => o.name === game.home_team)?.point;
          console.log(`Spread: ${game.home_team} ${homeSpread >= 0 ? '+' : ''}${homeSpread}`);
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

getMLBGames(); 