import pkg, { type Prediction, type PredictionOutcome as PredictionOutcomeType, type GameStatus as GameStatusType } from '@prisma/client';
const { PrismaClient, PredictionOutcome, GameStatus } = pkg;
import { OddsApiService } from '../src/lib/oddsApi.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const oddsApi = new OddsApiService();

// API configuration
const API_KEY = process.env.THE_ODDS_API_KEY;
const BASE_URL = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';

// Define types for API responses
interface GameScores {
  home: string;
  away: string;
}

interface GameResult {
  id: string;
  scores: GameScores;
  [key: string]: any;
}

// Helper to strip sport prefix from game ID
function stripSportPrefix(gameId: string): string {
  return gameId.replace(/^(nba|mlb)-game-/, '');
}

async function determinePredictionOutcome(prediction: Prediction, scores: { home: number; away: number } | null): Promise<PredictionOutcomeType> {
  if (!scores) {
    return PredictionOutcome.PENDING;
  }
  
  const homeWon = scores.home > scores.away;
  const awayWon = scores.away > scores.home;
  
  switch (prediction.predictionType) {
    case 'MONEYLINE':
      // For moneyline, we predict which team will win
      if (prediction.predictionValue > 0) {
        // Positive value means we're betting on the away team
        return awayWon ? PredictionOutcome.WIN : homeWon ? PredictionOutcome.LOSS : PredictionOutcome.PENDING;
      } else {
        // Negative value means we're betting on the home team
        return homeWon ? PredictionOutcome.WIN : awayWon ? PredictionOutcome.LOSS : PredictionOutcome.PENDING;
      }
      
    case 'SPREAD':
      // For spread, we need to apply the spread to the score
      const spread = prediction.predictionValue;
      const homeWithSpread = scores.home + spread;
      return homeWithSpread > scores.away ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      
    case 'TOTAL':
      // For total, we predict over/under
      const total = prediction.predictionValue;
      const combinedScore = scores.home + scores.away;
      return combinedScore > total ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      
    default:
      return PredictionOutcome.PENDING;
  }
}

async function updatePredictionOutcomes() {
  try {
    console.log('🔄 Starting prediction outcome update process...');
    
    // Get all completed games with pending predictions
    const completedGames = await prisma.game.findMany({
      where: {
        status: GameStatus.FINAL,
        predictions: {
          some: {
            outcome: PredictionOutcome.PENDING
          }
        }
      },
      include: {
        predictions: true
      }
    });
    
    console.log(`Found ${completedGames.length} completed games with pending predictions`);
    
    let updatedCount = 0;
    
    for (const game of completedGames) {
      console.log(`\nProcessing game: ${game.homeTeamName} vs ${game.awayTeamName}`);
      
      // Fetch the game scores from the API
      const scores = await oddsApi.getGameScores(game.sport, game.id);
      
      if (!scores) {
        console.log(`No scores found for game ${game.id}`);
        continue;
      }
      
      // Update each prediction for this game
      for (const prediction of game.predictions) {
        if (prediction.outcome !== PredictionOutcome.PENDING) {
          continue; // Skip already resolved predictions
        }
        
        const outcome = await determinePredictionOutcome(prediction, scores);
        
        if (outcome !== PredictionOutcome.PENDING) {
          await prisma.prediction.update({
            where: { id: prediction.id },
            data: { outcome }
          });
          
          console.log(`Updated prediction ${prediction.id}: ${prediction.predictionType} -> ${outcome}`);
          updatedCount++;
        }
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} prediction outcomes`);
    
  } catch (error) {
    console.error('Error updating prediction outcomes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update process
updatePredictionOutcomes(); 