import { PrismaClient } from '@prisma/client';
import { format, parseISO, subDays, addDays } from 'date-fns';

const prisma = new PrismaClient();

async function checkSpecificGames() {
  try {
    // Teams we're looking for
    const targetGames = [
      {
        date: '2025-04-20T23:13:00Z',
        homeTeam: 'Houston Astros',
        awayTeam: 'San Diego Padres'
      },
      {
        date: '2025-04-21T00:10:00Z',
        homeTeam: 'Colorado Rockies',
        awayTeam: 'Washington Nationals'
      }
    ];

    for (const targetGame of targetGames) {
      const date = parseISO(targetGame.date);
      const startDate = subDays(date, 1);
      const endDate = addDays(date, 1);

      console.log(`\nLooking for games between ${format(startDate, 'MMM d, yyyy')} and ${format(endDate, 'MMM d, yyyy')}:`);
      console.log(`Teams: ${targetGame.awayTeam} @ ${targetGame.homeTeam}`);

      const games = await prisma.game.findMany({
        where: {
          sport: 'MLB',
          gameDate: {
            gte: startDate,
            lte: endDate
          },
          OR: [
            {
              AND: [
                { homeTeamName: targetGame.homeTeam },
                { awayTeamName: targetGame.awayTeam }
              ]
            },
            {
              AND: [
                { homeTeamName: targetGame.awayTeam },
                { awayTeamName: targetGame.homeTeam }
              ]
            }
          ]
        }
      });

      if (games.length > 0) {
        console.log('Found games:');
        games.forEach(game => {
          console.log(`- ${game.awayTeamName} @ ${game.homeTeamName}`);
          console.log(`  Date: ${format(game.gameDate, 'MMM d, yyyy HH:mm:ss')}`);
          console.log(`  Status: ${game.status}`);
          console.log(`  Scores: ${game.awayScore ?? 'N/A'} - ${game.homeScore ?? 'N/A'}`);
        });
      } else {
        console.log('No games found');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkSpecificGames(); 