import { fetchPitcherStats } from '../src/mlb-data/fetch-pitcher-stats.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function testFetchPitcherStats() {
  const stats = await fetchPitcherStats();
  assert(Array.isArray(stats), 'Output should be an array');
  if (stats.length > 0) {
    const p = stats[0];
    assert(typeof p.name === 'string', 'Pitcher should have a name');
    assert('era' in p, 'Pitcher should have ERA');
    assert('whip' in p, 'Pitcher should have WHIP');
    assert('gamesStarted' in p, 'Pitcher should have gamesStarted');
    // Add more field checks as needed
  }
  console.log('fetchPitcherStats test passed!');
}

(async () => {
  try {
    await testFetchPitcherStats();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
