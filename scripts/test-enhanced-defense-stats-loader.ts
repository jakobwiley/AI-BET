import { loadEnhancedDefenseStats } from '../src/mlb-data/enhanced-defense-stats-loader.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function testEnhancedDefenseStatsLoader() {
  const stats = loadEnhancedDefenseStats();
  assert(Array.isArray(stats), 'Output should be an array');
  if (stats.length > 0) {
    const t = stats[0];
    assert(typeof t.team === 'string', 'Team should be a string');
    assert(typeof t.season === 'number', 'Season should be a number');
    assert('range_factor' in t, 'Should have range_factor');
    assert('double_plays' in t, 'Should have double_plays');
    assert('assists' in t, 'Should have assists');
    assert('errors' in t, 'Should have errors');
    assert('by_position' in t, 'Should have by_position');
    // Add more field checks as needed
  }
  console.log('Enhanced defense stats loader test passed!');
}

try {
  testEnhancedDefenseStatsLoader();
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
