import { OddsApiService } from '../lib/oddsApi.js';
import { PredictionService, TeamStats, H2HStats } from '../lib/predictionService.js';
import { NBAStatsService } from '../lib/nbaStatsApi.js';
import { MLBStatsService } from '../lib/mlbStatsApi.js';
import { prisma } from '../lib/prisma.js';
import { Game, GameStatus } from '../models/types.js';
import { PrismaClient, SportType, PredictionType, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';

class FetchInitialDataError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'FetchInitialDataError';
  }
}

async function validateApiCredentials(): Promise<{ apiKey: string; apiHost: string }> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const apiHost = process.env.ODDS_API_HOST;
  
  if (!apiKey || !apiHost) {
    throw new FetchInitialDataError('Missing API credentials. Please check your .env file.');
  }
  
  return { apiKey, apiHost };
}

async function fetchGamesForSport(oddsService: OddsApiService, sport: 'NBA' | 'MLB'): Promise<any[]> {
  try {
    console.log(`📊 Fetching ${sport} games...`);
    const games = await oddsService.getUpcomingGames(sport);
    
    if (!Array.isArray(games)) {
      throw new FetchInitialDataError(`Invalid response format for ${sport} games`);
    }
    
    console.log(`✅ Successfully fetched ${games.length} ${sport} games`);
    return games;
  } catch (error) {
    throw new FetchInitialDataError(`Failed to fetch ${sport} games`, error);
  }
}

async function saveGameToDatabase(game: any): Promise<string | null> {
  try {
    const gameDataForUpsert = {
      id: game.id,
      sport: game.sport as SportType,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeTeamName: game.homeTeamName,
      awayTeamName: game.awayTeamName,
      gameDate: parseISO(game.gameDate),
      status: 'SCHEDULED' as GameStatus,
      oddsJson: game.odds ? game.odds : Prisma.JsonNull,
      probableHomePitcherId: null,
      probableAwayPitcherId: null,
    };

    await prisma.game.upsert({
      where: { id: game.id },
      update: gameDataForUpsert,
      create: gameDataForUpsert,
    });
    
    return game.id;
  } catch (error) {
    console.error(`❌ Error upserting game ${game.id}:`, error);
    return null;
  }
}

async function fetchTeamStats(sport: 'NBA' | 'MLB', homeTeamName: string, awayTeamName: string): Promise<[TeamStats | null, TeamStats | null, H2HStats | null]> {
  try {
    const statsService = sport === 'NBA' ? NBAStatsService : MLBStatsService;
    return await Promise.all([
      statsService.getTeamStats(homeTeamName),
      statsService.getTeamStats(awayTeamName),
      statsService.getH2HStats(homeTeamName, awayTeamName)
    ]);
  } catch (error) {
    console.error(`❌ Error fetching stats for ${sport} game between ${homeTeamName} and ${awayTeamName}:`, error);
    return [null, null, null];
  }
}

async function generateAndSavePredictions(dbGame: any, gameForPrediction: Game, homeStats: TeamStats | null, awayStats: TeamStats | null, h2hStats: H2HStats | null): Promise<number> {
  try {
    const predictions = await PredictionService.getPredictionsForGame(gameForPrediction, homeStats, awayStats, h2hStats);
    
    if (predictions.length > 0) {
      await prisma.prediction.createMany({
        data: predictions.map(p => ({
          gameId: dbGame.id,
          predictionType: p.predictionType as PredictionType,
          predictionValue: p.predictionValue,
          confidence: p.confidence,
          reasoning: p.reasoning ?? 'No reasoning generated.',
        })),
        skipDuplicates: true,
      });
      return predictions.length;
    }
    return 0;
  } catch (error) {
    console.error(`❌ Error generating/saving predictions for game ${dbGame.id}:`, error);
    return 0;
  }
}

async function fetchInitialData() {
  try {
    console.log('🔄 Starting initial data fetch...');
    const { apiKey, apiHost } = await validateApiCredentials();
    const oddsService = new OddsApiService(apiKey, apiHost);
    
    // Fetch NBA and MLB games
    const [nbaGames, mlbGames] = await Promise.all([
      fetchGamesForSport(oddsService, 'NBA'),
      fetchGamesForSport(oddsService, 'MLB')
    ]);
    
    // Store games in database
    const allGames = [...nbaGames, ...mlbGames];
    const savedGameIds: string[] = [];
    console.log(`💾 Attempting to save/update ${allGames.length} games in DB...`);
    
    for (const game of allGames) {
      const savedId = await saveGameToDatabase(game);
      if (savedId) {
        savedGameIds.push(savedId);
      }
    }
    
    console.log(`✅ Successfully saved/updated ${savedGameIds.length} games.`);
    
    // Generate predictions for saved games
    if (savedGameIds.length > 0) {
      console.log(`🎯 Generating predictions for ${savedGameIds.length} games...`);
      const gamesToPredict = await prisma.game.findMany({
        where: { id: { in: savedGameIds } }
      });

      let predictionsGeneratedCount = 0;
      for (const dbGame of gamesToPredict) {
        try {
          // Reconstruct the Game type needed by PredictionService
          const gameForPrediction: Game = {
            id: dbGame.id,
            sport: dbGame.sport as Game['sport'],
            homeTeamId: dbGame.homeTeamId,
            awayTeamId: dbGame.awayTeamId,
            homeTeamName: dbGame.homeTeamName,
            awayTeamName: dbGame.awayTeamName,
            gameDate: dbGame.gameDate.toISOString(),
            startTime: 'N/A',
            status: dbGame.status as GameStatus,
            odds: dbGame.oddsJson as any,
            predictions: [],
            probableHomePitcherName: undefined,
            probableAwayPitcherName: undefined,
          };

          const [homeStats, awayStats, h2hStats] = await fetchTeamStats(
            dbGame.sport as 'NBA' | 'MLB',
            dbGame.homeTeamName,
            dbGame.awayTeamName
          );
          
          const predictionsCount = await generateAndSavePredictions(
            dbGame,
            gameForPrediction,
            homeStats,
            awayStats,
            h2hStats
          );
          
          predictionsGeneratedCount += predictionsCount;
        } catch (error) {
          console.error(`❌ Error processing game ${dbGame.id}:`, error);
          continue;
        }
      }
      console.log(`✅ Generated ${predictionsGeneratedCount} predictions.`);
    }
    
    console.log('✅ Initial data fetch script finished!');
  } catch (error) {
    if (error instanceof FetchInitialDataError) {
      console.error(`❌ Error: ${error.message}`);
      if (error.cause) {
        console.error('Caused by:', error.cause);
      }
    } else {
      console.error('❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Execute the script
fetchInitialData().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 