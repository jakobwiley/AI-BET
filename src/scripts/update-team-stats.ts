import { PrismaClient, SportType } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';
const CURRENT_SEASON = new Date().getFullYear();

interface MLBStandingsResponse {
  records: Array<{
    teamRecords: Array<{
      team: {
        id: number;
        name: string;
        abbreviation?: string;
      };
      wins: number;
      losses: number;
      runsScored: number;
      runsAllowed: number;
      gamesPlayed: number;
      winningPercentage: number;
      streak: {
        streakNumber: number;
      };
      splitRecords: Array<{
        type: string;
        wins: number;
        losses: number;
      }>;
    }>;
  }>;
}

interface MLBTeam {
  id: number;
  name: string;
  abbreviation: string;
}

async function fetchMLBTeams(): Promise<MLBTeam[]> {
  const res = await axios.get(`${MLB_API_BASE_URL}/teams?sportId=1`);
  const data = res.data as { teams: any[] };
  return data.teams.map((t: any) => ({
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation
  }));
}

async function fetchTeamStats(teamId: number) {
  try {
    const response = await axios.get<MLBStandingsResponse>(`${MLB_API_BASE_URL}/standings`, {
      params: {
        leagueId: '103,104', // Both AL and NL
        season: CURRENT_SEASON,
        teamId: teamId,
        standingsTypes: 'regularSeason'
      }
    });

    const teamRecord = response.data.records.flatMap(r => r.teamRecords)
      .find(tr => tr.team.id === teamId);

    if (!teamRecord) {
      console.warn(`No stats found for team ID ${teamId}`);
      return null;
    }

    const splitRecords = teamRecord.splitRecords || [];
    const homeRecord = splitRecords.find(r => r.type === 'home') || { wins: 0, losses: 0 };
    const awayRecord = splitRecords.find(r => r.type === 'away') || { wins: 0, losses: 0 };
    const lastTenRecord = splitRecords.find(r => r.type === 'lastTen') || { wins: 0, losses: 0 };

    return {
      wins: teamRecord.wins || 0,
      losses: teamRecord.losses || 0,
      homeWins: homeRecord.wins || 0,
      homeLosses: homeRecord.losses || 0,
      awayWins: awayRecord.wins || 0,
      awayLosses: awayRecord.losses || 0,
      pointsFor: teamRecord.runsScored || 0,
      pointsAgainst: teamRecord.runsAllowed || 0,
      lastTenGames: `${lastTenRecord.wins || 0}-${lastTenRecord.losses || 0}`,
      streak: teamRecord.streak?.streakNumber || 0,
      winPercentage: teamRecord.winningPercentage || 0,
      lastTenWins: lastTenRecord.wins || 0,
      avgRunsScored: teamRecord.runsScored ? teamRecord.runsScored / (teamRecord.gamesPlayed || 1) : 0,
      avgRunsAllowed: teamRecord.runsAllowed ? teamRecord.runsAllowed / (teamRecord.gamesPlayed || 1) : 0,
      homeWinPercentage: homeRecord.wins / (homeRecord.wins + homeRecord.losses || 1),
      awayWinPercentage: awayRecord.wins / (awayRecord.wins + awayRecord.losses || 1)
    };
  } catch (error) {
    console.error(`Error fetching stats for team ID ${teamId}:`, error);
    return null;
  }
}

async function updateTeamStats() {
  console.log('Starting team stats update...');
  try {
    // Get all MLB teams from the database
    const teams = await prisma.teamStats.findMany({
      where: {
        sport: SportType.MLB
      }
    });
    // Fetch MLB team ID mapping
    const mlbTeams = await fetchMLBTeams();
    const abbrToId: Record<string, number> = {};
    mlbTeams.forEach(t => { abbrToId[t.abbreviation] = t.id; });

    console.log(`Found ${teams.length} MLB teams to update`);

    for (const team of teams) {
      const mlbId = abbrToId[team.teamId];
      if (!mlbId) {
        console.warn(`No MLB numeric ID found for ${team.teamName} (${team.teamId})`);
        continue;
      }
      console.log(`\nUpdating stats for ${team.teamName} (MLB ID: ${mlbId})...`);
      // Fetch latest stats from MLB API
      const stats = await fetchTeamStats(mlbId);
      if (!stats) {
        console.warn(`No stats found for ${team.teamName}`);
        continue;
      }
      // Update team stats in database
      await prisma.teamStats.upsert({
        where: {
          teamId: team.teamId
        },
        update: {
          wins: stats.wins,
          losses: stats.losses,
          pointsScored: stats.pointsFor,
          pointsAllowed: stats.pointsAgainst,
          statsJson: {
            ...stats,
            lastUpdated: new Date().toISOString()
          }
        },
        create: {
          teamId: team.teamId,
          teamName: team.teamName,
          sport: SportType.MLB,
          wins: stats.wins,
          losses: stats.losses,
          pointsScored: stats.pointsFor,
          pointsAllowed: stats.pointsAgainst,
          statsJson: {
            ...stats,
            lastUpdated: new Date().toISOString()
          }
        }
      });
      console.log(`Updated stats for ${team.teamName}:`);
      console.log(`Record: ${stats.wins}-${stats.losses}`);
      console.log(`Runs Scored: ${stats.pointsFor}`);
      console.log(`Runs Allowed: ${stats.pointsAgainst}`);
      console.log(`Win %: ${(stats.winPercentage * 100).toFixed(1)}%`);
    }
    console.log('\nTeam stats update completed successfully!');
  } catch (error) {
    console.error('Error updating team stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateTeamStats(); 