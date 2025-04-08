import { NextResponse } from 'next/server';
import { PlayerPropsService } from '@/lib/playerProps';
import { PlayerProp } from '@/models/types';

interface TestResults {
  status: 'success' | 'partial_success';
  nba: {
    count: number;
    props: PlayerProp[];
  };
  mlb: {
    count: number;
    props: PlayerProp[];
  };
  errors: string[];
}

export async function GET() {
  const service = new PlayerPropsService();
  const results: TestResults = {
    status: 'success',
    nba: { count: 0, props: [] },
    mlb: { count: 0, props: [] },
    errors: []
  };

  try {
    console.log('Fetching NBA props...');
    const nbaProps = await service.getPopularPlayerProps('NBA');
    results.nba = {
      count: nbaProps.length,
      props: nbaProps
    };
    console.log(`Found ${nbaProps.length} NBA props`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching NBA props:', errorMessage);
    results.errors.push(`NBA Error: ${errorMessage}`);
  }

  try {
    console.log('Fetching MLB props...');
    const mlbProps = await service.getPopularPlayerProps('MLB');
    results.mlb = {
      count: mlbProps.length,
      props: mlbProps
    };
    console.log(`Found ${mlbProps.length} MLB props`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching MLB props:', errorMessage);
    results.errors.push(`MLB Error: ${errorMessage}`);
  }

  if (results.errors.length > 0) {
    results.status = 'partial_success';
  }

  return NextResponse.json(results);
} 