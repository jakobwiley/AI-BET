import axios from 'axios';

export interface PitcherStats {
  id: number;
  name: string;
  era: number;
  whip: number;
  strikeouts: number;
  innings: number;
  wins: number;
  losses: number;
  lastFiveERA: number;
  lastFiveGames: {
    date: string;
    opponent: string;
    inningsPitched: number;
    earnedRuns: number;
    strikeouts: number;
  }[];
}

const MLB_API_KEY = process.env.MLB_API_KEY;
const MLB_STATS_ENDPOINT = 'https://statsapi.mlb.com/api/v1';

export async function getPitcherStats(pitcherId: number): Promise<PitcherStats | null> {
  if (!pitcherId) return null;

  try {
    // Get basic pitcher info
    const playerResponse = await axios.get(`${MLB_STATS_ENDPOINT}/people/${pitcherId}`, {
      headers: {
        'Authorization': `Bearer ${MLB_API_KEY}`
      }
    });

    // Get season stats
    const statsResponse = await axios.get(
      `${MLB_STATS_ENDPOINT}/people/${pitcherId}/stats?stats=season&group=pitching`,
      {
        headers: {
          'Authorization': `Bearer ${MLB_API_KEY}`
        }
      }
    );

    // Get game log for last 5 games
    const gameLogResponse = await axios.get(
      `${MLB_STATS_ENDPOINT}/people/${pitcherId}/stats?stats=gameLog&group=pitching&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${MLB_API_KEY}`
        }
      }
    );

    const seasonStats = statsResponse.data.stats[0].splits[0].stat;
    const lastFiveGames = gameLogResponse.data.stats[0].splits.map(game => ({
      date: game.date,
      opponent: game.opponent.name,
      inningsPitched: game.stat.inningsPitched,
      earnedRuns: game.stat.earnedRuns,
      strikeouts: game.stat.strikeouts
    }));

    // Calculate last 5 games ERA
    const totalEarnedRuns = lastFiveGames.reduce((sum, game) => sum + game.earnedRuns, 0);
    const totalInnings = lastFiveGames.reduce((sum, game) => sum + game.inningsPitched, 0);
    const lastFiveERA = (totalEarnedRuns * 9) / totalInnings;

    return {
      id: pitcherId,
      name: playerResponse.data.people[0].fullName,
      era: seasonStats.era,
      whip: seasonStats.whip,
      strikeouts: seasonStats.strikeouts,
      innings: seasonStats.inningsPitched,
      wins: seasonStats.wins,
      losses: seasonStats.losses,
      lastFiveERA,
      lastFiveGames
    };
  } catch (error) {
    console.error('Error fetching pitcher stats:', error);
    return null;
  }
} 