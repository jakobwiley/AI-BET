import { NextResponse } from 'next/server';
import { OddsApiService } from '@/lib/oddsApi';

// Vercel Cron Job: Run at 8 AM and 4 PM Central Time (13:00 and 21:00 UTC)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('[CRON] Starting scheduled odds fetch job');
    const oddsService = new OddsApiService();

    // Fetch both NBA and MLB games in parallel
    const [nbaGames, mlbGames] = await Promise.all([
      oddsService.getUpcomingGames('NBA'),
      oddsService.getUpcomingGames('MLB')
    ]);

    console.log(`[CRON] Successfully fetched ${nbaGames.length} NBA games and ${mlbGames.length} MLB games`);

    return NextResponse.json({
      success: true,
      gamesUpdated: {
        nba: nbaGames.length,
        mlb: mlbGames.length
      }
    });
  } catch (error) {
    console.error('[CRON] Error in scheduled odds fetch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch odds' },
      { status: 500 }
    );
  }
} 