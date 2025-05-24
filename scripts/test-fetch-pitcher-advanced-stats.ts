import { fetchAdvancedPitcherStats } from '../src/mlb-data/fetch-pitcher-advanced-stats.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function testFetchAdvancedPitcherStats() {
  const stats = await fetchAdvancedPitcherStats();
  assert(Array.isArray(stats), 'Output should be an array');
  if (stats.length > 0) {
    const p = stats[0];
    assert(typeof p.Name === 'string', 'Pitcher should have a Name');
    assert('K/9' in p || 'ERA' in p, 'Pitcher should have advanced stats fields');
    // Add more field checks as needed
  }
  console.log('fetchAdvancedPitcherStats test passed!');
}

(async () => {
  try {
    await testFetchAdvancedPitcherStats();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
