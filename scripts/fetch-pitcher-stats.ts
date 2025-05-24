// Script: Fetch advanced pitcher stats for all probable MLB starters
// Uses MLB Stats API for core stats and scaffolds FanGraphs advanced stats integration
import fs from 'fs';
import path from 'path';
import axios from 'axios';
// Inline PitcherStats interface for script compatibility
interface PitcherStats {
  playerId: string;
  name: string;
  team: string;
  season: string;
  gamesStarted: number;
  inningsPitched: number;
  era: number;
  fip?: number;
  xfip?: number;
  siera?: number;
  kPer9: number;
  bbPer9: number;
  kbb?: number;
  whip: number;
  recentPitchCounts: number[];
  hand: 'L' | 'R';
  vsHandednessSplits?: {
    vsL: Partial<PitcherStats>;
    vsR: Partial<PitcherStats>;
  };
  lastUpdated: string;
}


const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

// Fetch probable pitchers for today's games
async function fetchProbablePitchers(date: string): Promise<any[]> {
  const scheduleUrl = `${MLB_API_BASE}/schedule?sportId=1&date=${date}&hydrate=probablePitcher,team,linescore`;
  const resp = await axios.get(scheduleUrl);
  const games = resp.data.dates[0]?.games || [];
  const pitchers: any[] = [];
  for (const game of games) {
    if (game.teams?.away?.probablePitcher) {
      pitchers.push({ ...game.teams.away.probablePitcher, team: game.teams.away.team.abbreviation });
    }
    if (game.teams?.home?.probablePitcher) {
      pitchers.push({ ...game.teams.home.probablePitcher, team: game.teams.home.team.abbreviation });
    }
  }
  // Remove duplicates by player ID
  const seen = new Set();
  return pitchers.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

// Fetch basic stats for a pitcher from MLB API
async function fetchPitcherBasicStats(playerId: string, season: string): Promise<any> {
  const statsUrl = `${MLB_API_BASE}/people/${playerId}/stats?stats=season&group=pitching&season=${season}`;
  const resp = await axios.get(statsUrl);
  const stats = resp.data.stats[0]?.splits[0]?.stat;
  return stats || {};
}

// Scaffold: Fetch advanced stats from FanGraphs (to be implemented)
async function fetchPitcherAdvancedStats(name: string, team: string, season: string): Promise<Partial<PitcherStats>> {
  // TODO: Implement FanGraphs scraping or public endpoint integration for FIP, xFIP, SIERA, etc.
  // For now, return empty values
  return {
    fip: undefined,
    xfip: undefined,
    siera: undefined,
    kbb: undefined,
    vsHandednessSplits: undefined,
  };
}

// Fetch recent pitch counts (last 5 starts)
async function fetchRecentPitchCounts(playerId: string, season: string): Promise<number[]> {
  // TODO: Implement using MLB Stats API game logs
  return [];
}

// Main function to fetch and save pitcher stats
async function fetchPitcherStatsForDate(date: string): Promise<PitcherStats[]> {
  const season = date.slice(0, 4);
  const pitchers = await fetchProbablePitchers(date);
  // Load advanced stats from pybaseball-generated JSON
  const fangraphsPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../data/fangraphsPitchers.json');
  let fangraphsStats: any[] = [];
  if (fs.existsSync(fangraphsPath)) {
    fangraphsStats = JSON.parse(fs.readFileSync(fangraphsPath, 'utf8'));
  } else {
    console.warn('Advanced pitcher stats JSON not found. Only MLB API stats will be used.');
  }
  const statsList: PitcherStats[] = [];
  const unmatched: string[] = [];
  for (const pitcher of pitchers) {
    try {
      const basicStats = await fetchPitcherBasicStats(pitcher.id, season);
      const recentPitchCounts = await fetchRecentPitchCounts(pitcher.id, season);
      const hand = pitcher.pitchHand?.code === 'L' ? 'L' : 'R';
      // Robust name (and team) matching
      const pName = (pitcher.fullName || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const fg = fangraphsStats.find((row: any) => {
        const fgName = (row.Name || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        // Try to match team as well, if available
        const fgTeam = (row.Team || '').toUpperCase();
        const pTeam = (pitcher.team || '').toUpperCase();
        return fgName === pName && (!row.Team || fgTeam === pTeam);
      });
      if (!fg) {
        unmatched.push(`${pitcher.fullName} (${pitcher.team})`);
      }
      statsList.push({
        playerId: pitcher.id.toString(),
        name: pitcher.fullName,
        team: pitcher.team,
        season,
        gamesStarted: Number(basicStats.gamesStarted || fg?.GS || 0),
        inningsPitched: Number(basicStats.inningsPitched || fg?.IP || 0),
        era: Number(basicStats.era || fg?.ERA || 0),
        fip: fg && fg.FIP !== undefined ? Number(fg.FIP) : undefined,
        xfip: fg && fg.xFIP !== undefined ? Number(fg.xFIP) : undefined,
        siera: fg && fg.SIERA !== undefined ? Number(fg.SIERA) : undefined,
        kPer9: basicStats.strikeOuts && basicStats.inningsPitched ? (9 * basicStats.strikeOuts / basicStats.inningsPitched) : (fg?.K9 !== undefined ? Number(fg.K9) : 0),
        bbPer9: basicStats.baseOnBalls && basicStats.inningsPitched ? (9 * basicStats.baseOnBalls / basicStats.inningsPitched) : (fg?.BB9 !== undefined ? Number(fg.BB9) : 0),
        kbb: fg && fg['K/BB'] !== undefined ? Number(fg['K/BB']) : undefined,
        whip: Number(basicStats.whip || fg?.WHIP || 0),
        recentPitchCounts,
        hand,
        vsHandednessSplits: undefined,
        lastUpdated: new Date().toISOString(),
      });
    } catch (e) {
      console.error(`Failed to fetch stats for pitcher ${pitcher.fullName}:`, e.message);
    }
  }
  if (unmatched.length > 0) {
    console.warn('Unmatched probable pitchers in advanced stats:', unmatched);
  }
  return statsList;
}

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const stats = await fetchPitcherStatsForDate(date);
  // ES module-compatible __dirname
  const __filename = new URL(import.meta.url).pathname;
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, '../data/pitcherStats.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));
  console.log(`Pitcher stats for ${date} saved to ${outputPath}`);
}

// ES module-compatible entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
