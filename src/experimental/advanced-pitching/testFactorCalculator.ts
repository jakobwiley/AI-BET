import { calculatePitcherFactor, calculatePitcherMatchupFactor, calculateBullpenFactor, calculateRecentFormFactor } from './factorCalculator.ts';
import { loadPitcherStatsFromJson } from './loader.ts';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Minimal type definitions for standalone test
interface PitcherStats {
  name: string;
  era: number;
  whip: number;
  fip: number;
  xfip: number;
  siera: number;
  kbb: number;
  war: number;
  bullpenEra?: number;
  recentFormEra?: number;
}

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load real pitcher stats from JSON
const dataPath = resolve(__dirname, 'data/samplePitcherStats.json');
const pitchers: PitcherStats[] = loadPitcherStatsFromJson(dataPath);
const [homePitcher, awayPitcher] = pitchers;

console.log('--- Advanced Pitcher Factor Calculation Test (Real Data) ---');
console.log('Home Pitcher:', homePitcher.name);
console.log('  Factor:', calculatePitcherFactor(homePitcher).toFixed(3));
console.log('  Bullpen Factor:', calculateBullpenFactor(homePitcher.bullpenEra).toFixed(3));
console.log('  Recent Form Factor:', calculateRecentFormFactor(homePitcher.recentFormEra).toFixed(3));
console.log('Away Pitcher:', awayPitcher.name);
console.log('  Factor:', calculatePitcherFactor(awayPitcher).toFixed(3));
console.log('  Bullpen Factor:', calculateBullpenFactor(awayPitcher.bullpenEra).toFixed(3));
console.log('  Recent Form Factor:', calculateRecentFormFactor(awayPitcher.recentFormEra).toFixed(3));
console.log('Pitcher Matchup Factor (0.5 = even, >0.5 favors home):', calculatePitcherMatchupFactor({team: 'Home', wins: 0, losses: 0, runsScored: 0, runsAllowed: 0, pitcher: homePitcher}, {team: 'Away', wins: 0, losses: 0, runsScored: 0, runsAllowed: 0, pitcher: awayPitcher}).toFixed(3));

// Demonstrate error handling for missing data
const incompletePitcher: PitcherStats = { name: 'Missing Data', era: NaN, whip: NaN, fip: NaN, xfip: NaN, siera: NaN, kbb: NaN, war: NaN };
console.log('\n--- Missing/Invalid Data Handling ---');
console.log('Incomplete Pitcher Factor:', calculatePitcherFactor(incompletePitcher).toFixed(3));
console.log('Incomplete Bullpen Factor:', calculateBullpenFactor(undefined).toFixed(3));
console.log('Incomplete Recent Form Factor:', calculateRecentFormFactor(undefined).toFixed(3));
console.log('--- Test Complete ---');
