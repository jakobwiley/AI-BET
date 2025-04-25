import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function checkGames() {
  try {
    // Get all MLB games
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB'
      },
      orderBy: {
        gameDate: 'desc'
      },
      select: {
        id: true,
        gameDate: true,
        awayTeamName: true,
        homeTeamName: true,
        sport: true,
        status: true,
        homeScore: true,
        awayScore: true,
        oddsJson: true
      }
    });

    console.log(`Found ${games.length} MLB games total`);
    
    // Group by status
    const byStatus = games.reduce((acc, game) => {
      acc[game.status] = (acc[game.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nGames by status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });
    
    // Group by month
    const byMonth = games.reduce((acc, game) => {
      const month = game.gameDate.toLocaleString('default', { month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nGames by month:');
    Object.entries(byMonth).forEach(([month, count]) => {
      console.log(`${month}: ${count}`);
    });
    
    // Show some sample games with odds
    console.log('\nSample games with odds:');
    games.slice(0, 5).forEach(game => {
      console.log(`${game.gameDate.toLocaleString()}: ${game.awayTeamName} @ ${game.homeTeamName} (${game.status})`);
      if (game.status === 'FINAL') {
        console.log(`Score: ${game.awayScore} - ${game.homeScore}`);
      }
      if (game.oddsJson) {
        const odds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
        const firstBookmaker = Object.values(odds)[0] || {};
        console.log('Odds:', JSON.stringify(firstBookmaker, null, 2));
      }
      console.log('---');
    });
  } catch (error) {
    console.error('Error checking games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGames(); 