import { NextRequest, NextResponse } from 'next/server';
import { Game, Prediction } from '@/models/types';
import { v4 as uuidv4 } from 'uuid';

// Sample test data for components
export async function GET(req: NextRequest) {
  // Create sample game data with odds and predictions
  const sampleGame: Game = {
    id: 'test-game-1',
    sport: 'NBA',
    homeTeamId: 'lakers',
    awayTeamId: 'celtics',
    homeTeamName: 'Los Angeles Lakers',
    awayTeamName: 'Boston Celtics',
    startTime: new Date().toISOString(),
    gameDate: new Date().toISOString(),
    status: 'Scheduled',
    homeTeamLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/lakers.png',
    awayTeamLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/celtics.png',
    spread: {
      home: -5.5,
      away: 5.5
    },
    moneyline: {
      home: -180,
      away: 150
    },
    total: 220.5,
    predictions: [
      {
        id: uuidv4(),
        gameId: 'test-game-1',
        predictionType: 'MONEYLINE',
        predictionValue: 'Los Angeles Lakers',
        confidence: 75,
        reasoning: 'Lakers are favored at home',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        gameId: 'test-game-1',
        predictionType: 'SPREAD',
        predictionValue: 'Boston Celtics',
        confidence: 65,
        reasoning: 'Celtics are expected to cover the spread',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        gameId: 'test-game-1',
        predictionType: 'TOTAL',
        predictionValue: 'over',
        confidence: 80,
        reasoning: 'Both teams have strong offenses',
        createdAt: new Date().toISOString()
      }
    ]
  };

  // Create MLB sample game
  const mlbGame: Game = {
    id: 'test-game-2',
    sport: 'MLB',
    homeTeamId: 'nyy',
    awayTeamId: 'bos',
    homeTeamName: 'New York Yankees',
    awayTeamName: 'Boston Red Sox',
    startTime: new Date().toISOString(),
    gameDate: new Date().toISOString(),
    status: 'Scheduled',
    homeTeamLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png',
    awayTeamLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png',
    spread: {
      home: -1.5,
      away: 1.5
    },
    moneyline: {
      home: -140,
      away: 120
    },
    total: 8.5,
    predictions: [
      {
        id: uuidv4(),
        gameId: 'test-game-2',
        predictionType: 'MONEYLINE',
        predictionValue: 'New York Yankees',
        confidence: 70,
        reasoning: 'Yankees are favored at home',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        gameId: 'test-game-2',
        predictionType: 'SPREAD',
        predictionValue: 'Boston Red Sox',
        confidence: 60,
        reasoning: 'Red Sox are expected to keep it close',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        gameId: 'test-game-2',
        predictionType: 'TOTAL',
        predictionValue: 'under',
        confidence: 65,
        reasoning: 'Good pitching matchup expected',
        createdAt: new Date().toISOString()
      }
    ]
  };

  // Return sample data
  return NextResponse.json({
    nbaGame: sampleGame,
    mlbGame: mlbGame,
    status: 200,
    message: 'Test component data loaded successfully'
  });
} 