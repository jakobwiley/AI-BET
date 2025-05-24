import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fetches today's MLB schedule and probable pitchers from MLB Stats API
export async function fetchMlbSchedule(date?: string) {
  const today = date || new Date().toISOString().slice(0, 10);
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=probablePitcher,team,linescore`;
  const resp = await axios.get(url);
  const games = resp.data.dates?.[0]?.games || [];
  const schedule = games.map((game: any) => ({
    gamePk: game.gamePk,
    homeTeam: game.teams.home.team.name,
    awayTeam: game.teams.away.team.name,
    homeProbablePitcher: game.teams.home.probablePitcher?.fullName || null,
    awayProbablePitcher: game.teams.away.probablePitcher?.fullName || null,
    gameDate: game.gameDate,
    venue: game.venue?.name || null
  }));
  const outPath = path.resolve(__dirname, '../../data/mlb_schedule_' + today + '.json');
  fs.writeFileSync(outPath, JSON.stringify(schedule, null, 2));
  console.log(`MLB schedule for ${today} saved to ${outPath}`);
  return schedule;
}

if (process.argv[1] === decodeURI(new URL(import.meta.url).pathname)) {
  fetchMlbSchedule().catch(console.error);
}
