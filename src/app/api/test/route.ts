import { NextResponse } from 'next/server';
import { OddsApiService } from '@/lib/oddsApi';

export async function GET() {
  try {
    console.log('[Test API] Testing NBA games fetch');
    const nbaGames = await OddsApiService.getUpcomingGames('NBA');
    
    console.log('[Test API] Testing MLB games fetch');
    const mlbGames = await OddsApiService.getUpcomingGames('MLB');
    
    return NextResponse.json({
      success: true,
      nba: {
        count: nbaGames.length,
        games: nbaGames.map(game => ({
          teams: `${game.homeTeamName} vs ${game.awayTeamName}`,
          time: game.startTime,
          hasOdds: !!game.odds,
          spread: game.odds?.spread,
          total: game.odds?.total,
          moneyline: game.odds?.moneyline
        }))
      },
      mlb: {
        count: mlbGames.length,
        games: mlbGames.map(game => ({
          teams: `${game.homeTeamName} vs ${game.awayTeamName}`,
          time: game.startTime,
          hasOdds: !!game.odds,
          spread: game.odds?.spread,
          total: game.odds?.total,
          moneyline: game.odds?.moneyline
        }))
      }
    });
  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 