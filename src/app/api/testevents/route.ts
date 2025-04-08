import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
    const API_HOST = 'https://api.the-odds-api.com/v4';
    const SPORT = 'basketball_nba'; // or 'baseball_mlb'
    
    console.log('Testing Odds API events endpoint with key:', API_KEY ? 'Key exists' : 'No key found');
    
    // Test the events endpoint with a direct call
    const response = await axios({
      method: 'GET',
      url: `${API_HOST}/sports/${SPORT}/events`,
      params: { 
        apiKey: API_KEY,
        dateFormat: 'iso'
      },
      timeout: 10000
    });
    
    // Return the events data
    return NextResponse.json({
      status: response.status,
      message: 'Events endpoint working correctly',
      count: response.data.length,
      firstEvent: response.data[0],
      key: API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 'No key found'
    });
  } catch (error: any) {
    console.error('Error testing Odds API events endpoint:', error);
    
    let errorResponse = {
      status: error.response?.status || 500,
      message: error.message || 'Unknown error',
      details: error.response?.data || null,
      key: process.env.NEXT_PUBLIC_THE_ODDS_API_KEY ? 'Key exists' : 'No key found'
    };
    
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
} 