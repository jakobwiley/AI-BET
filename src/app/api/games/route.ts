import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Game, Prediction } from '@/models/types';

const prisma = new PrismaClient();

function mapPrismaGameToTsGame(prismaGame: any): Game {
  // Make sure predictions are properly formatted
  const predictions = prismaGame.predictions?.map((prediction: any) => {
    // Handle null or undefined confidence
    if (prediction.confidence === null || prediction.confidence === undefined) {
      return {
        ...prediction,
        confidence: null,
        grade: 'PENDING',
        createdAt: prediction.createdAt?.toISOString(),
        updatedAt: prediction.updatedAt?.toISOString()
      };
    }
    
    // Ensure confidence is a number between 0-100
    let confidence = typeof prediction.confidence === 'string' 
      ? parseFloat(prediction.confidence) 
      : prediction.confidence;
    
    // If confidence is a decimal (0-1), convert to percentage (0-100)
    if (confidence !== null && confidence !== undefined && confidence <= 1) {
      confidence = confidence * 100;
    }
    
    return {
      ...prediction,
      confidence,
      grade: calculateGrade(confidence),
      createdAt: prediction.createdAt?.toISOString(),
      updatedAt: prediction.updatedAt?.toISOString()
    };
  }) || [];

  // Parse odds JSON if it exists
  let odds = undefined;
  try {
    if (prismaGame.oddsJson) {
      // If it's already an object, use it directly, otherwise parse the JSON string
      odds = typeof prismaGame.oddsJson === 'string' 
        ? JSON.parse(prismaGame.oddsJson) 
        : prismaGame.oddsJson;
    }
  } catch (error) {
    console.error(`[API] Error parsing odds JSON for game ${prismaGame.id}:`, error);
  }

  return {
    ...prismaGame,
    predictions,
    odds,
    gameDate: new Date(prismaGame.gameDate).toISOString(),
    createdAt: prismaGame.createdAt?.toISOString(),
    updatedAt: prismaGame.updatedAt?.toISOString()
  };
}

function calculateGrade(confidence: number | null): string {
  if (confidence === null) return 'PENDING';
  if (confidence >= 90) return 'A';
  if (confidence >= 80) return 'B';
  if (confidence >= 70) return 'C';
  if (confidence >= 60) return 'D';
  return 'F';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sport = searchParams.get('sport');

    // Query games based on sport filter if provided
    const games = await prisma.game.findMany({
      where: sport ? { 
        sport: sport as any // Type assertion to avoid the incompatibility issue
      } : undefined,
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    console.log(`[API] Found ${games.length} games`);

    // Map Prisma games to our TypeScript Game type
    const mappedGames = games.map(mapPrismaGameToTsGame);

    return NextResponse.json(mappedGames);
  } catch (error) {
    console.error('[API] Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 