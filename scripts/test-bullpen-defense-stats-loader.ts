import { loadBullpenDefenseStats } from '../src/mlb-data/bullpen-defense-stats-loader.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function testBullpenDefenseStatsLoader() {
  const stats = loadBullpenDefenseStats();
  assert(Array.isArray(stats), 'Output should be an array');
  if (stats.length > 0) {
    const t = stats[0];
    assert(typeof t.team === 'string', 'Team should be a string');
    assert('bullpen_era' in t, 'Should have bullpen_era');
    assert('oaa' in t, 'Should have oaa (Outs Above Average)');
    assert('fielding_runs_prevented' in t, 'Should have fielding_runs_prevented');
    assert('errors' in t, 'Should have errors');
    // Add more field checks as needed
  }
  console.log('Bullpen/Defense stats loader test passed!');
}

try {
  testBullpenDefenseStatsLoader();
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
