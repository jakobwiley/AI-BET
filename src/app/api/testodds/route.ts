import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const API_KEY = process.env.THE_ODDS_API_KEY;
    const API_HOST = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
    
    console.log('API Key:', API_KEY ? 'Present' : 'Missing');
    console.log('API Host:', API_HOST);
    
    // Test the API with a direct call to list sports
    const response = await axios.get(`${API_HOST}/sports`, {
      params: { apiKey: API_KEY }
    });
    
    console.log('API Response:', {
      status: response.status,
      sports: response.data
    });
    
    // If successful, try to get NBA events
    const nbaResponse = await axios.get(`${API_HOST}/sports/basketball_nba/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american',
        dateFormat: 'iso'
      }
    });
    
    return NextResponse.json({
      status: 'success',
      sports: response.data,
      nbaEvents: nbaResponse.data
    });
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    return NextResponse.json({
      status: 'error',
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    }, { status: error.response?.status || 500 });
  }
} 