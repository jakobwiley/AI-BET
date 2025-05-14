import { PrismaClient } from '@prisma/client';

async function checkGameStatuses() {
  const prisma = new PrismaClient();
  
  try {
    // Get count of games by status
    const gamesByStatus = await prisma.game.groupBy({
      by: ['status'],
      _count: true
    });
    console.log('Games by status:', gamesByStatus);

    // Get a sample of recent games with their details
    const recentGames = await prisma.game.findMany({
      take: 5,
      orderBy: {
        startTime: 'desc'
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeamName: true,
        awayTeamName: true
      }
    });
    console.log('\nMost recent games:', JSON.stringify(recentGames, null, 2));

  } catch (error) {
    console.error('Error checking games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGameStatuses(); 