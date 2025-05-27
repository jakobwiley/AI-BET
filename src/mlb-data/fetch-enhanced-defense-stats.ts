// Fetch and process enhanced defensive stats for all MLB teams from Baseball Savant (OAA) and MLB Stats API (fielding)
// Focus: 2025 season (current)
// Output: data/enhanced_defense_stats_<date>.json
// Sources:
//   - OAA (Outs Above Average): https://baseballsavant.mlb.com/leaderboard/outs_above_average?type=Fielding&team=true&season=2025&csv=true
//   - MLB Stats API (fielding): https://statsapi.mlb.com/api/v1/teams/stats?season=2025&group=fielding&stats=season&gameType=R

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

console.log('FETCHER STARTED');

export async function fetchEnhancedDefenseStats(season = 2025) {
  try {
    console.log('[DEBUG] process.cwd():', process.cwd());
  // Fetch OAA CSV for 2025 player OAA and aggregate by team
  const oaaCsvUrl = 'https://baseballsavant.mlb.com/leaderboard/outs_above_average?type=Fielder&startYear=2025&endYear=2025&split=no&team=&range=year&min=q&pos=&roles=&viz=hide&csv=true';
  console.log(`[INFO] Downloading OAA CSV: ${oaaCsvUrl}`);
  const oaaResp = await axios.get(oaaCsvUrl);
  const oaaCsv = oaaResp.data;
  console.log('[DEBUG] oaaCsv (first 200 chars):', typeof oaaCsv === 'string' ? oaaCsv.slice(0,200) : oaaCsv);
  const oaaRows = parse(oaaCsv, { columns: true });
  console.log(`[DEBUG] Player OAA rows:`, oaaRows.length, oaaRows.slice(0,2));
  if (!Array.isArray(oaaRows) || oaaRows.length === 0) {
    throw new Error('No OAA player data found in CSV.');
  }
  // MLB team name mapping: OAA CSV short name -> MLB API full name
  const MLB_TEAM_NAME_MAP: Record<string, string> = {
    'Diamondbacks': 'Arizona Diamondbacks',
    'Braves': 'Atlanta Braves',
    'Orioles': 'Baltimore Orioles',
    'Red Sox': 'Boston Red Sox',
    'Cubs': 'Chicago Cubs',
    'White Sox': 'Chicago White Sox',
    'Reds': 'Cincinnati Reds',
    'Guardians': 'Cleveland Guardians',
    'Rockies': 'Colorado Rockies',
    'Tigers': 'Detroit Tigers',
    'Astros': 'Houston Astros',
    'Royals': 'Kansas City Royals',
    'Angels': 'Los Angeles Angels',
    'Dodgers': 'Los Angeles Dodgers',
    'Marlins': 'Miami Marlins',
    'Brewers': 'Milwaukee Brewers',
    'Twins': 'Minnesota Twins',
    'Mets': 'New York Mets',
    'Yankees': 'New York Yankees',
    'Athletics': 'Oakland Athletics',
    'Phillies': 'Philadelphia Phillies',
    'Pirates': 'Pittsburgh Pirates',
    'Padres': 'San Diego Padres',
    'Giants': 'San Francisco Giants',
    'Mariners': 'Seattle Mariners',
    'Cardinals': 'St. Louis Cardinals',
    'Rays': 'Tampa Bay Rays',
    'Rangers': 'Texas Rangers',
    'Blue Jays': 'Toronto Blue Jays',
    'Nationals': 'Washington Nationals'
  };
  // Aggregate OAA by MLB team full name
  const oaaMap: Record<string, number> = {};
  for (const row of oaaRows) {
    const shortName = row['display_team_name']?.trim();
    const oaa = parseInt(row['outs_above_average'], 10);
    const fullName = MLB_TEAM_NAME_MAP[shortName];
    if (fullName && !isNaN(oaa)) {
      oaaMap[fullName] = (oaaMap[fullName] || 0) + oaa;
    }
  }
  console.log(`[INFO] Aggregated OAA for MLB teams: ${Object.keys(oaaMap).length}`);

  // Fetch fielding stats from MLB Stats API
  const fieldingUrl = `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&group=fielding&stats=season&gameType=R`;
  console.log(`[INFO] Fetching fielding stats from MLB Stats API: ${fieldingUrl}`);
  const fieldingResp = await axios.get(fieldingUrl);
  console.log('[DEBUG] fieldingResp.data:', JSON.stringify(fieldingResp.data).slice(0, 300));
  if (!fieldingResp.data || !Array.isArray(fieldingResp.data.stats) || !fieldingResp.data.stats[0] || !Array.isArray(fieldingResp.data.stats[0].splits)) {
    console.error('[ERROR] No fielding data returned from MLB Stats API. Raw:', JSON.stringify(fieldingResp.data).slice(0, 300));
    throw new Error('No fielding data returned from MLB Stats API');
  }
  const splits = fieldingResp.data.stats[0].splits;
  if (!splits.length) {
    console.error('[ERROR] No splits found in MLB Stats API response. Raw:', JSON.stringify(fieldingResp.data).slice(0, 300));
    throw new Error('No splits found in MLB Stats API response');
  }
  console.log(`[DEBUG] Fielding splits:`, splits.length, splits.slice(0,2));

  // Aggregate by team
  const results: any[] = [];
  for (const split of splits) {
    const teamName = split.team?.name;
    const stats = split.stat;
    if (!stats || !teamName) continue;
    results.push({
      team: teamName,
      season,
      oaa: oaaMap[teamName] ?? null,
      errors: parseInt(stats.errors, 10) || 0,
      assists: parseInt(stats.assists, 10) || 0,
      putouts: parseInt(stats.putOuts, 10) || 0,
      doublePlays: parseInt(stats.doublePlays, 10) || 0,
      fieldingPct: parseFloat(stats.fielding) || null
    });
  }
  console.log(`[INFO] Defensive stats aggregated for ${results.length} teams`);
  if (results.length === 0) {
    console.error('[ERROR] No results aggregated. OAA teams:', Object.keys(oaaMap), 'Fielding teams:', teams.map(t=>t.team.name));
    console.error('[DEBUG] OAA rows:', oaaRows);
    console.error('[DEBUG] Fielding teams:', teams);
    throw new Error('[FATAL] No enhanced defensive stats were aggregated. See debug output above for details.');
  } else {
    console.log('[DEBUG] First result:', results[0]);
    console.log('[DEBUG] All results:', results);
  }

  // Output as JSON
  const today = new Date().toISOString().slice(0, 10);
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`[DEBUG] Created missing data directory: ${dataDir}`);
  } else {
    console.log(`[DEBUG] Data directory exists: ${dataDir}`);
  }
  const outPath = path.resolve(dataDir, `enhanced_defense_stats_${today}.json`);
  console.log(`[DEBUG] Writing output to: ${outPath}`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`[SUCCESS] Output written to ${outPath}`);
  console.log('FETCHER COMPLETED');
  return results;
  } catch (err) {
    console.error('[ERROR] Failed to fetch enhanced defensive stats:', err);
    throw err;
  }
}

// Top-level invocation for CLI usage
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('fetch-enhanced-defense-stats.ts')) {
  fetchEnhancedDefenseStats()
    .then(() => console.log('DONE'))
    .catch((err) => { console.error('FATAL ERROR:', err); process.exit(1); });
}
