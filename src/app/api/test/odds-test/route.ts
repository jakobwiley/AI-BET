import { NextResponse } from 'next/server';
import { SportType } from '@/models/types';
import { getUpcomingGames, GameOdds } from '@/lib/gameData';

export async function GET(request: Request) {
  try {
    // Extract sport from query params (default to NBA)
    const url = new URL(request.url);
    const sportParam = url.searchParams.get('sport');
    const sport: SportType = (sportParam === 'MLB' ? 'MLB' : 'NBA') as SportType;
    
    console.log(`[Test Odds API] Testing odds data for ${sport}`);
    
    // Get odds data for the sport
    const games = getUpcomingGames(sport);
    
    // Verify that odds data is complete for all games
    const gamesWithCompleteOdds = games.filter(game => 
      game.spread && game.total && game.moneyline
    );
    
    const oddsStatusByGame = games.map(game => ({
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      hasSpread: !!game.spread,
      hasTotal: !!game.total,
      hasMoneyline: !!game.moneyline,
      complete: !!game.spread && !!game.total && !!game.moneyline
    }));
    
    // Return test results
    return NextResponse.json({
      status: 200,
      message: `Odds data test for ${sport}`,
      totalGames: games.length,
      gamesWithCompleteOdds: gamesWithCompleteOdds.length,
      percentComplete: games.length ? Math.round((gamesWithCompleteOdds.length / games.length) * 100) : 0,
      oddsStatusByGame,
      sample: gamesWithCompleteOdds.length > 0 ? gamesWithCompleteOdds[0] : null
    });
  } catch (error: any) {
    console.error('[Test Odds API] Error:', error);
    return NextResponse.json({
      status: 500,
      message: `Error testing odds data: ${error.message}`,
      error: error.toString()
    }, { status: 500 });
  }
} 