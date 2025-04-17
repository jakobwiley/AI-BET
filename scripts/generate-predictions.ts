#!/usr/bin/env node

import { PrismaClient, SportType, PredictionOutcome } from '@prisma/client';
import { PredictionService } from '../src/lib/predictionService';
import { MLBStatsService } from '../src/lib/mlbStatsApi';
import { NBAStatsService } from '../src/lib/nbaStatsApi';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function generatePredictions() {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get MLB games
    const mlbGames = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        gameDate: {
          gte: today,
          lt: tomorrow
        },
        oddsJson: {
          not: {
            equals: null
          }
        }
      }
    });

    console.log('\n=== Generating MLB Predictions ===');
    console.log(`Found ${mlbGames.length} MLB games with odds\n`);

    for (const game of mlbGames) {
      console.log(`Generating predictions for ${game.awayTeamName} @ ${game.homeTeamName}`);
      
      try {
        // Parse the odds JSON data
        const rawOdds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
        
        // Transform odds data to match PredictionService expectations
        const odds = {
          spread: {
            homeSpread: rawOdds.spread.homeSpread,
            awaySpread: rawOdds.spread.awaySpread,
            homeOdds: rawOdds.spread.homeOdds,
            awayOdds: rawOdds.spread.awayOdds
          },
          moneyline: {
            homeOdds: rawOdds.moneyline.homeOdds,
            awayOdds: rawOdds.moneyline.awayOdds
          },
          total: {
            overUnder: rawOdds.total.overUnder,
            overOdds: rawOdds.total.overOdds,
            underOdds: rawOdds.total.underOdds
          }
        };
        
        // Convert game to the format expected by PredictionService
        const gameForPrediction = {
          id: game.id,
          sport: game.sport,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: game.gameDate.toISOString(),
          startTime: game.startTime || 'N/A',
          status: game.status,
          odds
        };

        // Fetch team stats and head-to-head stats
        const [homeStats, awayStats] = await Promise.all([
          MLBStatsService.getTeamStats(game.homeTeamName),
          MLBStatsService.getTeamStats(game.awayTeamName)
        ]);

        if (!homeStats || !awayStats) {
          console.error(`Could not fetch stats for ${game.homeTeamName} or ${game.awayTeamName}`);
          continue;
        }

        const h2hStats = await MLBStatsService.getH2HStats(game.homeTeamName, game.awayTeamName);
        
        const predictions = await PredictionService.getPredictionsForGame(
          gameForPrediction,
          homeStats,
          awayStats,
          h2hStats
        );
        
        // Save predictions to database
        for (const prediction of predictions) {
          await prisma.prediction.create({
            data: {
              gameId: game.id,
              predictionType: prediction.predictionType,
              predictionValue: prediction.predictionValue,
              confidence: prediction.confidence,
              reasoning: prediction.reasoning,
              outcome: PredictionOutcome.PENDING
            }
          });
        }
        
        console.log(`Generated ${predictions.length} predictions\n`);
      } catch (error) {
        console.error(`Error generating predictions for ${game.id}:`, error);
      }
    }

    // Get NBA games
    const nbaGames = await prisma.game.findMany({
      where: {
        sport: SportType.NBA,
        gameDate: {
          gte: today,
          lt: tomorrow
        },
        oddsJson: {
          not: {
            equals: null
          }
        }
      }
    });

    console.log('\n=== Generating NBA Predictions ===');
    console.log(`Found ${nbaGames.length} NBA games with odds\n`);

    for (const game of nbaGames) {
      console.log(`Generating predictions for ${game.awayTeamName} @ ${game.homeTeamName}`);
      
      try {
        // Parse the odds JSON data
        const rawOdds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
        
        // Transform odds data to match PredictionService expectations
        const odds = {
          spread: {
            homeSpread: rawOdds.spread.homeSpread,
            awaySpread: rawOdds.spread.awaySpread,
            homeOdds: rawOdds.spread.homeOdds,
            awayOdds: rawOdds.spread.awayOdds
          },
          moneyline: {
            homeOdds: rawOdds.moneyline.homeOdds,
            awayOdds: rawOdds.moneyline.awayOdds
          },
          total: {
            overUnder: rawOdds.total.overUnder,
            overOdds: rawOdds.total.overOdds,
            underOdds: rawOdds.total.underOdds
          }
        };
        
        // Convert game to the format expected by PredictionService
        const gameForPrediction = {
          id: game.id,
          sport: game.sport,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: game.gameDate.toISOString(),
          startTime: game.startTime || 'N/A',
          status: game.status,
          odds
        };

        // Fetch team stats and head-to-head stats
        const [homeStats, awayStats] = await Promise.all([
          NBAStatsService.getTeamStats(game.homeTeamName),
          NBAStatsService.getTeamStats(game.awayTeamName)
        ]);

        if (!homeStats || !awayStats) {
          console.error(`Could not fetch stats for ${game.homeTeamName} or ${game.awayTeamName}`);
          continue;
        }

        const h2hStats = await NBAStatsService.getH2HStats(game.homeTeamName, game.awayTeamName);
        
        const predictions = await PredictionService.getPredictionsForGame(
          gameForPrediction,
          homeStats,
          awayStats,
          h2hStats
        );
        
        // Save predictions to database
        for (const prediction of predictions) {
          await prisma.prediction.create({
            data: {
              gameId: game.id,
              predictionType: prediction.predictionType,
              predictionValue: prediction.predictionValue,
              confidence: prediction.confidence,
              reasoning: prediction.reasoning,
              outcome: PredictionOutcome.PENDING
            }
          });
        }
        
        console.log(`Generated ${predictions.length} predictions\n`);
      } catch (error) {
        console.error(`Error generating predictions for ${game.id}:`, error);
      }
    }

    console.log('\nCompleted generating predictions');
  } catch (error) {
    console.error('Error generating predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generatePredictions(); 