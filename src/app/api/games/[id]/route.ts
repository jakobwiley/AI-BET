import { NextResponse } from 'next/server';
import { OddsApiService } from '@/lib/oddsApi';
import { PredictionService } from '@/lib/predictionService';
import { Game, SportType } from '@/models/types';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { ApiManager } from '@/lib/apiManager';

const prisma = new PrismaClient();

// Helper to convert Prisma Game to TS Game (can be shared or moved)
function mapPrismaGameToTsGame(prismaGame: any): Game {
  return {
    ...prismaGame,
    gameDate: prismaGame.gameDate.toISOString(),
    odds: prismaGame.oddsJson ? JSON.parse(JSON.stringify(prismaGame.oddsJson)) : undefined,
    oddsJson: undefined,
    predictions: prismaGame.predictions?.map((p: any) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    })) || []
  };
}

export async function GET(
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
    // Check DB first
    let gameFromDb = await prisma.game.findUnique({
        where: { id: gameId },
        include: { predictions: true },
    });

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

    // --- Determine Sport (Required for external fetch) --- 
    // This is tricky. The game ID from the API often includes team names/date
    // but maybe not the sport explicitly. We might need to TRY fetching from NBA,
    // then MLB if the first fails, or infer from ID structure if possible.
    // For now, let's ASSUME we can infer it or try NBA first.
    // TODO: Implement more robust sport determination for unknown game IDs
    let sportToTry: SportType = 'NBA'; // Default assumption
    // --- Add logic here later to determine sport better ---
    
    console.log(`[API /api/games/${gameId}] Fetching external details (trying ${sportToTry})...`);
    // Use the NEW external fetch method
    const gameDataFromApi: Game | null = await oddsService.getExternalGameById(sportToTry, gameId);

    if (!gameDataFromApi) {
        // Optional: Try MLB if NBA failed?
        // For now, just return 404 if the primary attempt fails.
        console.log(`[API /api/games/${gameId}] Game not found via Odds API.`);
        return NextResponse.json({ error: 'Game not found' }, { status: 404, headers: corsHeaders });
    }
    
    // Game found via API, now create in DB within a transaction
    console.log(`[API /api/games/${gameId}] Game found via API. Creating in DB...`);
    const createdGameWithPredictions = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let newGame: any;
        try {
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
                    status: gameDataFromApi.status,
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
    return NextResponse.json(
      { error: 'Failed to process game details', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
} 