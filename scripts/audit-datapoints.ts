import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const today = new Date().toISOString().slice(0, 10);
const predictionsPath = path.resolve(DATA_DIR, `mlbPredictions_${today}.json`);
const pitcherStatsPath = path.resolve(DATA_DIR, 'pitcherStats.json');
const fangraphsStatsPath = path.resolve(DATA_DIR, 'fangraphsPitchers.json');
const defenseStatsPath = path.resolve(DATA_DIR, `enhanced_defense_stats_${today}.json`);
const hitterStatsPath = path.resolve(DATA_DIR, `hitter_splits_streaks_${today}.json`);

function loadJson(file: string) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const predictions = loadJson(predictionsPath) || [];
const pitcherStats = loadJson(pitcherStatsPath) || [];
const fangraphsStats = loadJson(fangraphsStatsPath) || [];
const defenseStats = loadJson(defenseStatsPath) || [];
const hitterStats = loadJson(hitterStatsPath) || [];

const defenseTeams = new Set(defenseStats.map((d: any) => d.team));
const pitcherNames = new Set(pitcherStats.map((p: any) => p.name));
const fangraphsNames = new Set(fangraphsStats.map((p: any) => p.Name || p.name));
// Support hitter stats as array or object
let hitterArray: any[] = [];
if (Array.isArray(hitterStats)) {
  hitterArray = hitterStats;
} else if (hitterStats && typeof hitterStats === 'object') {
  hitterArray = Object.values(hitterStats);
}
const hitterNames = new Set(hitterArray.map((h: any) => h.name));

const datapoints = [
  { label: 'Wins', key: 'wins' },
  { label: 'Losses', key: 'losses' },
  { label: 'Home Win %', key: 'homeWinPercentage' },
  { label: 'Away Win %', key: 'awayWinPercentage' },
  { label: 'Recent Form', key: 'lastTenGames' },
  { label: 'Points For', key: 'pointsFor' },
  { label: 'Points Against', key: 'pointsAgainst' },
  { label: 'Runs Scored', key: 'runsScored' },
  { label: 'Runs Allowed', key: 'runsAllowed' },
  { label: 'Team ERA', key: 'teamERA' },
  { label: 'Team WHIP', key: 'teamWHIP' },
  { label: 'OPS vs LHP', key: 'opsVsLHP' },
  { label: 'OPS vs RHP', key: 'opsVsRHP' },
  { label: 'Key Batters', key: 'keyPlayers.batting' },
  { label: 'Key Pitchers', key: 'keyPlayers.pitching' },
  { label: 'Pitcher ERA', key: 'pitcherERA' },
  { label: 'Pitcher WHIP', key: 'pitcherWHIP' },
  { label: 'Pitcher FIP', key: 'pitcherFIP' },
  { label: 'Pitcher WAR', key: 'pitcherWAR' },
  { label: 'OAA', key: 'oaa' },
  { label: 'Fielding %', key: 'fielding_pct' },
  { label: 'Errors', key: 'errors' },
  { label: 'Assists', key: 'assists' },
  { label: 'Putouts', key: 'putouts' },
  { label: 'Hit Streak', key: 'hitStreak' },
  { label: 'On-Base Streak', key: 'onBaseStreak' },
  { label: 'Multi-Hit Streak', key: 'multiHitStreak' },
  { label: 'HR Streak', key: 'hrStreak' }
];

function checkDatapoint(obj: any, key: string) {
  // Support nested keys like keyPlayers.batting
  if (key.includes('.')) {
    const [first, ...rest] = key.split('.');
    if (!obj[first]) return false;
    if (Array.isArray(obj[first]) && obj[first].length === 0) return false;
    return checkDatapoint(obj[first], rest.join('.'));
  }
  return obj[key] !== undefined && obj[key] !== null && obj[key] !== '';
}

console.log('Game-by-game datapoint audit:');
for (const game of predictions) {
  const home = game.homeTeamName || game.homeTeam || (game.teams?.home?.team?.name);
  const away = game.awayTeamName || game.awayTeam || (game.teams?.away?.team?.name);
  console.log(`\n${home} vs ${away}`);
  for (const teamType of ['homeStats', 'awayStats']) {
    const stats = game[teamType];
    console.log(`  ${teamType}:`);
    for (const dp of datapoints) {
      let present = false;
      if (stats) {
        present = checkDatapoint(stats, dp.key);
        if (!present && dp.key.startsWith('pitcher')) {
          // Try pitcher name lookup
          const pitcherName = stats.keyPlayers?.pitching?.[0]?.name || stats.keyPlayers?.pitching?.[0]?.Name;
          if (pitcherName) {
            if (dp.key === 'pitcherERA') present = pitcherNames.has(pitcherName) && pitcherStats.find((p: any) => p.name === pitcherName && p.era !== undefined);
            if (dp.key === 'pitcherWHIP') present = pitcherNames.has(pitcherName) && pitcherStats.find((p: any) => p.name === pitcherName && p.whip !== undefined);
            if (dp.key === 'pitcherFIP') present = fangraphsNames.has(pitcherName) && fangraphsStats.find((p: any) => (p.Name === pitcherName || p.name === pitcherName) && (p.FIP !== undefined || p.fip !== undefined));
            if (dp.key === 'pitcherWAR') present = fangraphsNames.has(pitcherName) && fangraphsStats.find((p: any) => (p.Name === pitcherName || p.name === pitcherName) && (p.WAR !== undefined || p.war !== undefined));
          }
        }
        if (!present && ['oaa','fielding_pct','errors','assists','putouts'].includes(dp.key)) {
          present = defenseTeams.has(stats.team || home || away);
        }
        if (!present && ['hitStreak','onBaseStreak','multiHitStreak','hrStreak'].includes(dp.key)) {
          // Check hitter stats
          present = hitterNames.has(stats.keyPlayers?.batting?.[0]?.name || stats.keyPlayers?.batting?.[0]?.Name);
        }
      }
      // Print present/missing for this datapoint
      console.log(`    ${dp.label}: ${present ? 'present' : 'missing'}`);
    }
  }
}
