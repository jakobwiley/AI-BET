import { NextRequest, NextResponse } from 'next/server';
import { OddsApiService } from '@/lib/oddsApi';
import { PredictionService } from '@/lib/predictionService';
import { Game, SportType } from '@/models/types';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { ApiManager } from '@/lib/apiManager';
import { GameStatus } from '@/models/types';

const prisma = new PrismaClient();

/**
 * Maps a Prisma Game object to our TypeScript Game type
 */
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
      
      console.log(`[API] Parsed odds for game ${prismaGame.id}:`, JSON.stringify(odds).substring(0, 100) + '...');
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

/**
 * Calculate grade based on confidence level
 */
function calculateGrade(confidence: number): string {
  if (confidence === null || confidence === undefined) return 'PENDING';
  if (confidence >= 85) return 'A';
  if (confidence >= 70) return 'B';
  if (confidence >= 55) return 'C';
  return 'D';
}

/**
 * GET handler for /api/games/[id]
 * Returns a specific game by ID with its predictions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = params.id;
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Fetching game ${gameId}`);
    
    // Try to find the game in the database
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        predictions: true
      }
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Map to our TypeScript type and ensure all data is properly formatted
    const mappedGame = mapPrismaGameToTsGame(game);
    console.log(`[API] Returning game with ${mappedGame.predictions?.length || 0} predictions`);
    
    return NextResponse.json(mappedGame);
  } catch (error) {
    console.error(`Error fetching game:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for /api/games/[id]
 * Handles CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(
  request: Request, 
  { params }: { params: { id: string } }
) {
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const gameId = params.id;
  console.log(`[API /api/games/${gameId}] Received request`);

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID is required' }, { status: 400, headers: corsHeaders });
  }

  try {
    // Check DB first - try both with and without prefix
    console.log(`[API /api/games/${gameId}] Searching for game with ID: ${gameId}`);
    
    // Try different formats of the game ID
    const possibleIds = [
      gameId,                                   // Original ID
      gameId.replace(/^(nba|mlb)-game-/, ''),  // Remove prefix if exists
      `nba-game-${gameId}`,                    // Add NBA prefix if not exists
      `mlb-game-${gameId}`                      // Add MLB prefix if not exists
    ];
    
    console.log(`[API /api/games/${gameId}] Trying these IDs: ${possibleIds.join(', ')}`);
    
    // Try to find the game with any of the possible IDs
    let gameFromDb = null;
    for (const id of possibleIds) {
      try {
        const game = await prisma.game.findUnique({
          where: { id },
          include: { predictions: true },
        });
        
        if (game) {
          console.log(`[API /api/games/${gameId}] Found game with ID: ${id}`);
          gameFromDb = game;
          break;
        }
      } catch (err) {
        console.log(`[API /api/games/${gameId}] Error trying ID ${id}: ${err}`);
      }
    }

    if (gameFromDb) {
        console.log(`[API /api/games/${gameId}] Game found in DB.`);
        // Potential future logic: Check if gameDate is old, refetch from API if needed?
        return NextResponse.json(mapPrismaGameToTsGame(gameFromDb), { headers: corsHeaders });
    }

    // --- Game not in DB, fetch from API and potentially create --- 
    console.log(`[API /api/games/${gameId}] Game not found in DB. Fetching from Odds API...`);
    const apiKey = process.env.THE_ODDS_API_KEY;
    const apiHost = process.env.ODDS_API_HOST;
    if (!apiKey || !apiHost) {
       return NextResponse.json({ error: 'API credentials not configured on server' }, { status: 500, headers: corsHeaders });
    }
    const oddsService = new OddsApiService(apiKey, apiHost);

    // Determine Sport from game ID
    let sportToTry: SportType;
    if (gameId.startsWith('mlb-')) {
        sportToTry = 'MLB';
    } else if (gameId.startsWith('nba-')) {
        sportToTry = 'NBA';
    } else {
        // Try to determine from the game ID format
        const mlbPattern = /baseball|mlb/i;
        const nbaPattern = /basketball|nba/i;
        
        if (mlbPattern.test(gameId)) {
            sportToTry = 'MLB';
        } else if (nbaPattern.test(gameId)) {
            sportToTry = 'NBA';
        } else {
            // Default to NBA but try MLB if NBA fails
            sportToTry = 'NBA';
        }
    }
    
    console.log(`[API /api/games/${gameId}] Determined sport type: ${sportToTry}`);
    let gameDataFromApi: Game | null = await oddsService.getExternalGameById(sportToTry, gameId);

    // If NBA failed and we defaulted to it, try MLB
    if (!gameDataFromApi && sportToTry === 'NBA' && !gameId.startsWith('nba-')) {
        console.log(`[API /api/games/${gameId}] NBA fetch failed, trying MLB...`);
        sportToTry = 'MLB';
        gameDataFromApi = await oddsService.getExternalGameById(sportToTry, gameId);
    }

    if (!gameDataFromApi) {
        console.log(`[API /api/games/${gameId}] Game not found via Odds API for either sport type.`);
        return NextResponse.json({ error: 'Game not found' }, { status: 404, headers: corsHeaders });
    }
    
    // Game found via API, now create in DB within a transaction
    console.log(`[API /api/games/${gameId}] Game found via API. Creating in DB...`);
    const createdGameWithPredictions = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let newGame: any;
        try {
            // Validate game status
            const status = Object.values(GameStatus).includes(gameDataFromApi.status) 
                ? gameDataFromApi.status 
                : GameStatus.SCHEDULED;

            newGame = await tx.game.create({
                data: {
                    id: gameDataFromApi.id,
                    sport: gameDataFromApi.sport,
                    homeTeamId: gameDataFromApi.homeTeamId,
                    awayTeamId: gameDataFromApi.awayTeamId,
                    homeTeamName: gameDataFromApi.homeTeamName,
                    awayTeamName: gameDataFromApi.awayTeamName,
                    gameDate: parseISO(gameDataFromApi.gameDate),
                    startTime: gameDataFromApi.startTime,
                    status,
                    oddsJson: gameDataFromApi.odds ? JSON.parse(JSON.stringify(gameDataFromApi.odds)) : undefined,
                },
            });
        } catch (createError: any) {
             if (createError.code === 'P2002') { // Handle race condition
                 console.warn(`[API /api/games/${gameId}] Race condition: Game created concurrently. Fetching existing.`);
                 return tx.game.findUnique({ where: { id: gameId }, include: { predictions: true } });
             } else {
                 throw createError;
             }
        }

        if (!newGame) return null; // Should only happen in race condition handled above

        console.log(`[API /api/games/${gameId}] Game created. Generating predictions...`);
        
        // Get the API manager instance
        const apiManager = ApiManager.getInstance();
        
        // Fetch required stats
        const [homeStats, awayStats, h2hStats] = await Promise.all([
            apiManager.getTeamStats(gameDataFromApi.sport, gameDataFromApi.homeTeamName),
            apiManager.getTeamStats(gameDataFromApi.sport, gameDataFromApi.awayTeamName),
            apiManager.getH2HStats(gameDataFromApi.sport, gameDataFromApi.homeTeamName, gameDataFromApi.awayTeamName)
        ]);

        const generatedPredictions = await PredictionService.getPredictionsForGame(
            gameDataFromApi,
            homeStats,
            awayStats,
            h2hStats
        );

        if (generatedPredictions.length > 0) {
            await tx.prediction.createMany({
                data: generatedPredictions.map(p => ({
                    gameId: newGame.id,
                    predictionType: p.predictionType,
                    predictionValue: p.predictionValue,
                    confidence: p.confidence,
                    grade: p.grade,
                    reasoning: p.reasoning ?? 'No reasoning generated.',
                })),
                skipDuplicates: true,
            });
            console.log(`[API /api/games/${gameId}] Saved ${generatedPredictions.length} predictions.`);
        }
        // Fetch again to include predictions
        return tx.game.findUnique({ where: { id: newGame.id }, include: { predictions: true } });
    });

    if (!createdGameWithPredictions) {
        // This might happen if the race condition fetch failed, which is unlikely
         console.error(`[API /api/games/${gameId}] Failed to create or retrieve game after API fetch.`);
         return NextResponse.json({ error: 'Failed to save game data' }, { status: 500, headers: corsHeaders });
    }

    console.log(`[API /api/games/${gameId}] Returning newly created game with predictions.`);
    return NextResponse.json(mapPrismaGameToTsGame(createdGameWithPredictions), { headers: corsHeaders });

  } catch (error) {
    console.error(`[API /api/games/${gameId}] Error:`, error);
    
    // Handle specific error types
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Game not found', details: 'The requested game does not exist in the database' },
          { status: 404, headers: corsHeaders }
        );
      }
    }
    
    // Handle validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { error: 'Invalid game data', details: 'The game data is not in the expected format' },
        { status: 422, headers: corsHeaders }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to process game details', 
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: error instanceof Error ? error.name : 'UnknownError'
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 