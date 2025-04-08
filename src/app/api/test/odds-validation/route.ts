import { NextResponse } from 'next/server';
import { SportType } from '@/models/types';
import { getUpcomingGames, GameOdds } from '@/lib/gameData';

export async function GET() {
  try {
    // Results object to track validation
    const results = {
      nba: {
        status: 'pending',
        message: 'Not tested',
        totalGames: 0,
        gamesWithOdds: 0,
        percentComplete: 0,
        oddsSample: null as GameOdds | null,
        errors: [] as string[]
      },
      mlb: {
        status: 'pending',
        message: 'Not tested',
        totalGames: 0,
        gamesWithOdds: 0,
        percentComplete: 0,
        oddsSample: null as GameOdds | null,
        errors: [] as string[]
      }
    };

    // Test NBA odds
    try {
      const nbaGames = getUpcomingGames('NBA');
      results.nba.totalGames = nbaGames.length;
      
      const nbaGamesWithCompleteOdds = nbaGames.filter(game => 
        game.spread && game.total && game.moneyline
      );
      
      results.nba.gamesWithOdds = nbaGamesWithCompleteOdds.length;
      results.nba.percentComplete = nbaGames.length ? 
        Math.round((nbaGamesWithCompleteOdds.length / nbaGames.length) * 100) : 0;
      
      if (nbaGamesWithCompleteOdds.length > 0) {
        results.nba.oddsSample = nbaGamesWithCompleteOdds[0];
      }
      
      results.nba.status = nbaGamesWithCompleteOdds.length > 0 ? 'success' : 'warning';
      results.nba.message = nbaGamesWithCompleteOdds.length > 0 ? 
        'NBA odds data is available' : 
        'No NBA games with complete odds data found';
    } catch (error: any) {
      results.nba.status = 'error';
      results.nba.message = `Error fetching NBA odds: ${error.message}`;
      results.nba.errors.push(error.toString());
    }

    // Test MLB odds
    try {
      const mlbGames = getUpcomingGames('MLB');
      results.mlb.totalGames = mlbGames.length;
      
      const mlbGamesWithCompleteOdds = mlbGames.filter(game => 
        game.spread && game.total && game.moneyline
      );
      
      results.mlb.gamesWithOdds = mlbGamesWithCompleteOdds.length;
      results.mlb.percentComplete = mlbGames.length ? 
        Math.round((mlbGamesWithCompleteOdds.length / mlbGames.length) * 100) : 0;
      
      if (mlbGamesWithCompleteOdds.length > 0) {
        results.mlb.oddsSample = mlbGamesWithCompleteOdds[0];
      }
      
      results.mlb.status = mlbGamesWithCompleteOdds.length > 0 ? 'success' : 'warning';
      results.mlb.message = mlbGamesWithCompleteOdds.length > 0 ? 
        'MLB odds data is available' : 
        'No MLB games with complete odds data found';
    } catch (error: any) {
      results.mlb.status = 'error';
      results.mlb.message = `Error fetching MLB odds: ${error.message}`;
      results.mlb.errors.push(error.toString());
    }

    // Determine overall validation status
    const overallStatus = (results.nba.status === 'success' || results.mlb.status === 'success') ? 
      'success' : 'error';

    // Return test results
    return NextResponse.json({
      status: 200,
      overallStatus,
      message: `Odds validation ${overallStatus === 'success' ? 'passed' : 'failed'}`,
      results
    });
  } catch (error: any) {
    console.error('[Odds Validation] Error:', error);
    return NextResponse.json({
      status: 500,
      message: `Error validating odds data: ${error.message}`,
      error: error.toString()
    }, { status: 500 });
  }
} 