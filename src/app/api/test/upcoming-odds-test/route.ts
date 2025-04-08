import { NextResponse } from 'next/server';
import { Game, SportType } from '@/models/types';
import { getUpcomingGames, GameOdds } from '@/lib/gameData';

export async function GET() {
  try {
    const now = new Date();
    const sportsToTest: SportType[] = ['NBA', 'MLB'];
    const results: Record<string, any> = {};

    for (const sport of sportsToTest) {
      console.log(`[UpcomingOddsTest] Testing ${sport} odds filtering`);
      
      const games = getUpcomingGames(sport);
      
      // Categorize games
      const pastGames = games.filter(game => {
        const gameTime = new Date(game.startTime);
        return gameTime < now;
      });
      
      const upcomingGames = games.filter(game => {
        const gameTime = new Date(game.startTime);
        return gameTime >= now;
      });

      results[sport] = {
        totalGames: games.length,
        pastGames: pastGames.length,
        upcomingGames: upcomingGames.length,
        sampleGame: games[0],
        oddsComplete: games.every(game => 
          game.spread && 
          game.total && 
          game.moneyline
        )
      };
    }

    return NextResponse.json({
      status: 'success',
      message: 'Odds filtering test completed',
      results
    });

  } catch (error: any) {
    console.error('[UpcomingOddsTest] Error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Unknown error occurred',
      error: error.toString()
    }, { status: 500 });
  }
} 