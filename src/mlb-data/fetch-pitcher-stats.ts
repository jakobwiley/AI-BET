import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Fetches basic pitcher stats for all probable pitchers today
export async function fetchPitcherStats(date?: string) {
  const today = date || new Date().toISOString().slice(0, 10);
  const schedulePath = path.resolve(__dirname, '../../data/mlb_schedule_' + today + '.json');
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));

  const pitcherNames = Array.from(new Set([
    ...schedule.map((g: any) => g.homeProbablePitcher),
    ...schedule.map((g: any) => g.awayProbablePitcher)
  ])).filter(Boolean);

  const stats: any[] = [];
  for (const name of pitcherNames) {
    // Example: Use MLB Stats API search (replace with more robust logic as needed)
    const searchUrl = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}`;
    const searchResp = await axios.get(searchUrl);
    const personId = searchResp.data.people?.[0]?.id;
    if (!personId) continue;
    const statsUrl = `https://statsapi.mlb.com/api/v1/people/${personId}/stats?stats=season&group=pitching`;
    const statsResp = await axios.get(statsUrl);
    const pitchingStats = statsResp.data.stats?.[0]?.splits?.[0]?.stat;
    if (!pitchingStats) continue;
    stats.push({
      name,
      era: pitchingStats.era,
      whip: pitchingStats.whip,
      fip: pitchingStats.fip,
      wins: pitchingStats.wins,
      losses: pitchingStats.losses,
      gamesStarted: pitchingStats.gamesStarted,
      inningsPitched: pitchingStats.inningsPitched,
      strikeOuts: pitchingStats.strikeOuts,
      walks: pitchingStats.baseOnBalls,
      homeRuns: pitchingStats.homeRuns,
      hits: pitchingStats.hits,
      // Add more as needed
    });
  }
  const outPath = path.resolve(__dirname, '../../data/pitcherStats_' + today + '.json');
  fs.writeFileSync(outPath, JSON.stringify(stats, null, 2));
  console.log(`Pitcher stats for ${today} saved to ${outPath}`);
  return stats;
}

if (require.main === module) {
  fetchPitcherStats().catch(console.error);
}
