import { PrismaClient, SportType } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';

async function fetchMLBTeams() {
  const res = await axios.get(`${MLB_API_BASE_URL}/teams?sportId=1`);
  const data: any = res.data;
  return data.teams;
}

async function fetchTeamStats(teamId: number) {
  // Fetch last 162 games (full season) for the team
  const res = await axios.get(`${MLB_API_BASE_URL}/teams/${teamId}/stats?stats=season&group=hitting,pitching,fielding`);
  const data: any = res.data;
  return data.stats;
}

async function main() {
  try {
    const teams = await fetchMLBTeams();
    for (const team of teams) {
      const statsArr = await fetchTeamStats(team.id);
      const hittingStats = statsArr.find((s: any) => s.group.displayName === 'hitting')?.splits[0]?.stat || {};
      const pitchingStats = statsArr.find((s: any) => s.group.displayName === 'pitching')?.splits[0]?.stat || {};
      // You can expand this with more stats as needed
      const wins = Number(hittingStats.wins || 0);
      const losses = Number(hittingStats.losses || 0);
      const runsScored = Number(hittingStats.runs || 0);
      const gamesPlayed = Number(hittingStats.gamesPlayed || 0);
      const avgRunsScored = gamesPlayed ? runsScored / gamesPlayed : 0;
      // Upsert into teamStats
      await prisma.teamStats.upsert({
        where: { teamId: team.abbreviation },
        update: {
          teamName: team.name,
          sport: SportType.MLB,
          wins,
          losses,
          pointsScored: runsScored,
          pointsAllowed: 0, // Not available in hitting stats
          statsJson: {
            wins,
            losses,
            runsScored,
            gamesPlayed,
            avgRunsScored,
            hittingStats,
            pitchingStats
          }
        },
        create: {
          teamId: team.abbreviation,
          teamName: team.name,
          sport: SportType.MLB,
          wins,
          losses,
          pointsScored: runsScored,
          pointsAllowed: 0,
          statsJson: {
            wins,
            losses,
            runsScored,
            gamesPlayed,
            avgRunsScored,
            hittingStats,
            pitchingStats
          }
        }
      });
      console.log(`Updated stats for ${team.name}`);
    }
    console.log('MLB team stats backfill complete.');
  } catch (error) {
    console.error('Error backfilling MLB team stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 