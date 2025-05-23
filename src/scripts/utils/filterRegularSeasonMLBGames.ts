import { prisma } from '../lib/prisma.ts';

/**
 * Fetch all 2025 regular season MLB games from the database, including predictions.
 * Only includes games on or after March 20, 2025 (Opening Day).
 */
export async function get2025RegularSeasonMLBGames() {
  const openingDay = new Date('2025-03-20T00:00:00Z');
  return prisma.game.findMany({
    where: {
      sport: 'MLB',
      gameDate: {
        gte: openingDay,
      },
    },
    include: {
      predictions: true,
    },
    orderBy: {
      gameDate: 'asc',
    },
  });
} 