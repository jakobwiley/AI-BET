import { OddsApiService } from '../src/lib/oddsApi';
import { PredictionService, TeamStats, H2HStats } from '../src/lib/predictionService';
import { NBAStatsService } from '../src/lib/nbaStatsApi';
import { MLBStatsService } from '../src/lib/mlbStatsApi';
import { prisma } from '../src/lib/prisma';
import { Game, GameStatus } from '../src/models/types';
import { Prisma, SportType, PredictionType } from '@prisma/client';
import { parseISO } from 'date-fns';

async function fetchInitialData() {
  try {
    console.log('🔄 Fetching initial games...');
    const oddsService = new OddsApiService();
    
    // Fetch NBA and MLB games
    const nbaGames = await oddsService.getUpcomingGames('NBA');
    console.log(`📊 Found ${nbaGames.length} NBA games from API.`);
    const mlbGames = await oddsService.getUpcomingGames('MLB');
    console.log(`📊 Found ${mlbGames.length} MLB games from API.`);
    
    // Store games in database (handle potential Prisma type issues)
    const allGames = [...nbaGames, ...mlbGames];
    const savedGameIds: string[] = [];
    console.log(`💾 Attempting to save/update ${allGames.length} games in DB...`);
    for (const game of allGames) {
      // Use Prisma types for upsert data
      const gameDataForUpsert = {
        id: game.id,
        sport: game.sport as SportType,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        homeTeamName: game.homeTeamName,
        awayTeamName: game.awayTeamName,
        gameDate: parseISO(game.gameDate),
        status: GameStatus.SCHEDULED,
        oddsJson: game.odds ? game.odds : Prisma.JsonNull,
        probableHomePitcherId: null,
        probableAwayPitcherId: null,
      };

      try {
        await prisma.game.upsert({
          where: { id: game.id },
          update: gameDataForUpsert,
          create: gameDataForUpsert,
        });
        savedGameIds.push(game.id);
      } catch (upsertError) {
        console.error(`❌ Error upserting game ${game.id}:`, upsertError);
      }
    }
    console.log(`✅ Successfully saved/updated ${savedGameIds.length} games.`);
    
    // Generate initial predictions for successfully saved games
    if (savedGameIds.length > 0) {
        console.log(`🎯 Generating initial predictions for ${savedGameIds.length} games...`);
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

                let homeStats: TeamStats | null = null;
                let awayStats: TeamStats | null = null;
                let h2hStats: H2HStats | null = null;
                
                // Fetch stats, handling potential errors
                try {
                    if (dbGame.sport === 'NBA') {
                        [homeStats, awayStats, h2hStats] = await Promise.all([
                            NBAStatsService.getTeamStats(dbGame.homeTeamName),
                            NBAStatsService.getTeamStats(dbGame.awayTeamName),
                            NBAStatsService.getH2HStats(dbGame.homeTeamName, dbGame.awayTeamName)
                        ]);
                    } else if (dbGame.sport === 'MLB') {
                        [homeStats, awayStats, h2hStats] = await Promise.all([
                            MLBStatsService.getTeamStats(dbGame.homeTeamName),
                            MLBStatsService.getTeamStats(dbGame.awayTeamName),
                            MLBStatsService.getH2HStats(dbGame.homeTeamName, dbGame.awayTeamName)
                        ]);
                    } else {
                        console.warn(`[fetch-initial-data] Unsupported sport ${dbGame.sport} for game ${dbGame.id}`);
                        continue;
                    }
                } catch (statsError) {
                    console.error(`[fetch-initial-data] Error fetching stats for game ${dbGame.id}:`, statsError);
                }
                
                // Call prediction service
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
                    predictionsGeneratedCount += predictions.length;
                }
            } catch (predictionError) {
                console.error(`❌ Error generating/saving predictions for game ${dbGame.id}:`, predictionError);
            }
        }
        console.log(`✅ Generated ${predictionsGeneratedCount} predictions.`);
    }
    
    console.log('✅ Initial data fetch script finished!');
  } catch (error) {
    console.error('❌ Error in fetchInitialData script:', error);
  }
}

fetchInitialData(); 