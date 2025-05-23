import type { Game, Prediction } from '../models/types.ts';
import { Prisma } from '@prisma/client';

// Define the expected Prisma Game type with relations
type PrismaGameWithPredictions = Prisma.GameGetPayload<{
    include: { predictions: true }
}>

// Helper to convert Prisma Game to TS Game
export function mapPrismaGameToTsGame(prismaGame: PrismaGameWithPredictions): Game {
  // Base mapping
  const gameBase: Omit<Game, 'predictions' | 'odds' | 'probableHomePitcherName' | 'probableAwayPitcherName'> = {
    id: prismaGame.id,
    sport: prismaGame.sport as Game['sport'],
    homeTeamId: prismaGame.homeTeamId,
    awayTeamId: prismaGame.awayTeamId,
    homeTeamName: prismaGame.homeTeamName,
    awayTeamName: prismaGame.awayTeamName,
    gameDate: prismaGame.gameDate.toISOString(),
    startTime: prismaGame.startTime ?? 'N/A', // Handle potential null from Prisma
    status: prismaGame.status as Game['status'],
  };

  // Map odds
  const odds = prismaGame.oddsJson ? JSON.parse(JSON.stringify(prismaGame.oddsJson)) : undefined;

  // Map predictions, handling potential missing 'grade'
  const predictions = prismaGame.predictions?.map((p): Prediction => ({
    id: p.id,
    gameId: p.gameId,
    predictionType: p.predictionType as Prediction['predictionType'],
    predictionValue: p.predictionValue,
    confidence: p.confidence,
    grade: (p as any).grade ?? null, // Attempt to access grade, default to null
    reasoning: p.reasoning,
    createdAt: p.createdAt.toISOString(),
    // updatedAt is not in TS type
  })) || [];

  // Final Game object
  const mappedGame: Game = {
    ...gameBase,
    odds,
    predictions,
    probableHomePitcherName: undefined, // Set to undefined as Prisma likely has ID
    probableAwayPitcherName: undefined, // Set to undefined as Prisma likely has ID
  };

  return mappedGame;
} 