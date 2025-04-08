import { NextRequest, NextResponse } from 'next/server';
import { SportsApiService } from '@/lib/sportsApi';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;
    const nbaGames = await SportsApiService.getUpcomingGames('NBA');
    const mlbGames = await SportsApiService.getUpcomingGames('MLB');
    
    const game = [...nbaGames, ...mlbGames].find(g => g.id === gameId);
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
  }
} 