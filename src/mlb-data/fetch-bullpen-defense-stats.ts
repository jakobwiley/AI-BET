import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fetch and process bullpen and defense stats for all MLB teams
// Data sources: MLB Stats API (https://statsapi.mlb.com), Baseball Savant (https://baseballsavant.mlb.com)
// Output: data/bullpen_defense_stats_<date>.json

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEAM_IDS = [
  108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 158
]; // All MLB team IDs

function parseSavantOAA(csvText: string) {
  // Parse CSV text from Baseball Savant OAA endpoint and aggregate by team
  const rows = csvText.trim().split(/\r?\n/);
  const header = rows[0].replace(/"/g, '').split(',');
  const teamOAA: Record<string, { oaa: number; fielding_runs_prevented: number; count: number }> = {};
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.replace(/"/g, ''));
    const team = cols[2]; // display_team_name
    const oaa = Number(cols[6]); // outs_above_average
    const frp = Number(cols[5]); // fielding_runs_prevented
    if (!team) continue;
    if (!teamOAA[team]) teamOAA[team] = { oaa: 0, fielding_runs_prevented: 0, count: 0 };
    if (!isNaN(oaa)) teamOAA[team].oaa += oaa;
    if (!isNaN(frp)) teamOAA[team].fielding_runs_prevented += frp;
    teamOAA[team].count++;
  }
  // Average (or sum) by team
  const result: Record<string, { oaa: number; fielding_runs_prevented: number }> = {};
  for (const team in teamOAA) {
    result[team] = {
      oaa: teamOAA[team].oaa,
      fielding_runs_prevented: teamOAA[team].fielding_runs_prevented
    };
  }
  return result;
}

export async function fetchBullpenDefenseStats(date?: string) {
  const today = date || new Date().toISOString().slice(0, 10);
  const results: any[] = [];

  // 1. Fetch and aggregate OAA from Baseball Savant
  const savantOAAUrl = 'https://baseballsavant.mlb.com/leaderboard/outs_above_average?type=Fielding&team=true&season=2024&csv=true';
  const savantResp = await axios.get(savantOAAUrl);
  const teamOAA = parseSavantOAA(savantResp.data);

  for (const teamId of TEAM_IDS) {
    // Pitching (bullpen) stats
    const pitchingUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?stats=season&group=pitching`;
    const pitchingResp = await axios.get(pitchingUrl);
    const pitchingStats = pitchingResp.data.stats?.[0]?.splits?.[0]?.stat || {};

    // Fielding (defense) stats
    const fieldingUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?stats=season&group=fielding`;
    const fieldingResp = await axios.get(fieldingUrl);
    const fieldingStats = fieldingResp.data.stats?.[0]?.splits?.[0]?.stat || {};

    // Team name/abbr
    const teamName = pitchingResp.data.stats?.[0]?.splits?.[0]?.team?.abbreviation || String(teamId);

    // Advanced OAA (if available)
    const oaaStats = teamOAA[teamName] || { oaa: null, fielding_runs_prevented: null };

    results.push({
      team: teamName,
      bullpen_era: Number(pitchingStats.era),
      bullpen_ip: Number(pitchingStats.inningsPitched),
      bullpen_saves: Number(pitchingStats.saves),
      bullpen_blown_saves: Number(pitchingStats.blownSaves),
      bullpen_so: Number(pitchingStats.strikeOuts),
      bullpen_bb: Number(pitchingStats.baseOnBalls),
      errors: Number(fieldingStats.errors),
      fielding_pct: Number(fieldingStats.fielding),
      assists: Number(fieldingStats.assists),
      putouts: Number(fieldingStats.putOuts),
      oaa: oaaStats.oaa,
      fielding_runs_prevented: oaaStats.fielding_runs_prevented
    });
  }

  const outPath = path.resolve(__dirname, '../../data/bullpen_defense_stats_' + today + '.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Bullpen/defense stats for ${today} saved to ${outPath}`);
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchBullpenDefenseStats().catch(console.error);
}
