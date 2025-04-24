import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMlbTeams() {
  try {
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB'
      },
      select: {
        homeTeamName: true,
        awayTeamName: true
      },
      distinct: ['homeTeamName', 'awayTeamName']
    });

    const teams = new Set<string>();
    games.forEach(game => {
      teams.add(game.homeTeamName);
      teams.add(game.awayTeamName);
    });

    console.log('MLB Teams in database:');
    Array.from(teams).sort().forEach(team => {
      console.log(`- ${team}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkMlbTeams(); 