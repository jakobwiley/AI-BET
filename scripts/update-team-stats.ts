import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { format, subDays } from 'date-fns';

const prisma = new PrismaClient();

interface TeamStats {
  lastNGames: {
    wins: number;
    losses: number;
    runsScored: number;
    runsAllowed: number;
    avgMargin: number;
  };
  homeStats?: {
    wins: number;
    losses: number;
    runsScored: number;
    runsAllowed: number;
  };
  awayStats?: {
    wins: number;
    losses: number;
    runsScored: number;
    runsAllowed: number;
  };
}

interface TeamPerformance {
  [teamId: string]: TeamStats;
}

async function updateTeamStats() {
  try {
    // Get all completed MLB games from the last 30 days
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        status: 'FINAL',
        gameDate: {
          gte: startDate,
          lt: endDate
        }
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    console.log(`Found ${games.length} completed MLB games in the last 30 days`);

    // Calculate team performance metrics
    const teamStats: TeamPerformance = {};

    // Initialize stats for all teams
    games.forEach(game => {
      if (!teamStats[game.homeTeamId]) {
        teamStats[game.homeTeamId] = {
          lastNGames: { wins: 0, losses: 0, runsScored: 0, runsAllowed: 0, avgMargin: 0 },
          homeStats: { wins: 0, losses: 0, runsScored: 0, runsAllowed: 0 },
          awayStats: { wins: 0, losses: 0, runsScored: 0, runsAllowed: 0 }
        };
      }
      if (!teamStats[game.awayTeamId]) {
        teamStats[game.awayTeamId] = {
          lastNGames: { wins: 0, losses: 0, runsScored: 0, runsAllowed: 0, avgMargin: 0 },
          homeStats: { wins: 0, losses: 0, runsScored: 0, runsAllowed: 0 },
          awayStats: { wins: 0, losses: 0, runsScored: 0, runsAllowed: 0 }
        };
      }
    });

    // Calculate stats for each team
    games.forEach(game => {
      const { homeTeamId, awayTeamId, homeScore, awayScore } = game;
      
      if (homeScore === null || awayScore === null) return;

      // Update home team stats
      const homeTeam = teamStats[homeTeamId];
      homeTeam.lastNGames.runsScored += homeScore;
      homeTeam.lastNGames.runsAllowed += awayScore;
      homeTeam.homeStats!.runsScored += homeScore;
      homeTeam.homeStats!.runsAllowed += awayScore;
      
      if (homeScore > awayScore) {
        homeTeam.lastNGames.wins++;
        homeTeam.homeStats!.wins++;
      } else {
        homeTeam.lastNGames.losses++;
        homeTeam.homeStats!.losses++;
      }

      // Update away team stats
      const awayTeam = teamStats[awayTeamId];
      awayTeam.lastNGames.runsScored += awayScore;
      awayTeam.lastNGames.runsAllowed += homeScore;
      awayTeam.awayStats!.runsScored += awayScore;
      awayTeam.awayStats!.runsAllowed += homeScore;
      
      if (awayScore > homeScore) {
        awayTeam.lastNGames.wins++;
        awayTeam.awayStats!.wins++;
      } else {
        awayTeam.lastNGames.losses++;
        awayTeam.awayStats!.losses++;
      }
    });

    // Calculate averages and store in database
    for (const [teamId, stats] of Object.entries(teamStats)) {
      const totalGames = stats.lastNGames.wins + stats.lastNGames.losses;
      if (totalGames > 0) {
        stats.lastNGames.avgMargin = 
          (stats.lastNGames.runsScored - stats.lastNGames.runsAllowed) / totalGames;
      }

      // Fetch teamName from the most recent game for this teamId
      const recentGame = games.find(g => g.homeTeamId === teamId || g.awayTeamId === teamId);
      let teamName = teamId;
      if (recentGame) {
        if (recentGame.homeTeamId === teamId) {
          teamName = recentGame.homeTeamName;
        } else if (recentGame.awayTeamId === teamId) {
          teamName = recentGame.awayTeamName;
        }
      }

      // Store stats in database
      await prisma.teamStats.upsert({
        where: { teamId },
        create: {
          teamId,
          teamName,
          sport: 'MLB',
          statsJson: stats as unknown as import('@prisma/client').Prisma.JsonObject
        },
        update: {
          teamName,
          statsJson: stats as unknown as import('@prisma/client').Prisma.JsonObject
        }
      });
    }

    console.log('Team statistics updated successfully');
    
    // Print some sample stats
    const sampleTeamId = Object.keys(teamStats)[0];
    if (sampleTeamId) {
      console.log('\nSample team stats:');
      console.log(JSON.stringify(teamStats[sampleTeamId], null, 2));
    }

  } catch (error) {
    console.error('Error updating team stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateTeamStats(); 