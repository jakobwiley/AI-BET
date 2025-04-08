import { NextResponse } from 'next/server';
import { OddsApiService } from '@/lib/oddsApi';
import { SportType } from '@/models/types';

export async function GET(request: Request) {
  try {
    console.log('[API] Received request:', request.url);
    
    // Enable CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      console.log('[API] Handling OPTIONS request');
      return new NextResponse(null, { headers });
    }

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') as SportType;
    console.log('[API] Sport parameter:', sport);

    if (!sport || !['NBA', 'MLB'].includes(sport)) {
      console.log('[API] Invalid sport parameter:', sport);
      return NextResponse.json(
        { error: 'Invalid sport parameter' },
        { status: 400, headers }
      );
    }

    console.log(`[API] Fetching ${sport} games...`);
    const games = await OddsApiService.getUpcomingGames(sport);
    console.log(`[API] Found ${games.length} ${sport} games:`, {
      firstGame: games[0],
      hasOdds: games.some(g => g.odds),
      gameIds: games.map(g => g.id)
    });

    return NextResponse.json(games, { headers });
  } catch (error) {
    console.error('[API] Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
} 