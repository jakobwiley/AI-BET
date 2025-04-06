// Simple script to test the Odds API key
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';

async function testApiKey() {
  console.log('Testing API key...');
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 'Missing');
  console.log('API Host:', API_HOST);
  
  if (!API_KEY) {
    console.error('API key is not defined. Please check your environment variables.');
    return false;
  }
  
  try {
    // Make a simple request to test the API key
    const url = `${API_HOST}/sports`;
    const queryParams = {
      apiKey: API_KEY
    };

    console.log(`Making request to: ${url}`);
    
    const response = await axios({
      method: 'GET',
      url,
      params: queryParams
    });

    console.log(`API key test successful! Response status: ${response.status}`);
    console.log(`Available sports: ${response.data.map(sport => sport.title).join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('API key test failed:', error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    
    return false;
  }
}

testApiKey(); 