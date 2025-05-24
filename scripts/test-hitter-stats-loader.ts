import { HitterStatsLoader } from '../src/mlb-data/hitter-stats-loader.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function testHitterStatsLoader() {
  const loader = new HitterStatsLoader();
  const stats = loader.getByName('Aaron Judge');
  assert(stats, 'Aaron Judge stats should be defined');
  assert(stats.vs_hand, 'vs_hand splits should be defined');
  assert(stats.vs_hand.L, 'vs_hand.L should be defined');
  assert(stats.vs_hand.R, 'vs_hand.R should be defined');
  assert(!isNaN(Number(stats.vs_hand.L.OPS)), 'vs_hand.L.OPS should be a number');
  assert(!isNaN(Number(stats.vs_hand.R.OPS)), 'vs_hand.R.OPS should be a number');
  assert(stats.recent, 'recent splits should be defined');
  assert(stats.recent['7'], 'recent[7] should be defined');
  assert(stats.recent['14'], 'recent[14] should be defined');
  assert(stats.recent['30'], 'recent[30] should be defined');
  assert(stats.streaks, 'streaks should be defined');
  assert(stats.streaks.hit !== undefined, 'streaks.hit should be defined');
  assert(stats.streaks.on_base !== undefined, 'streaks.on_base should be defined');
  assert(stats.streaks.multi_hit !== undefined, 'streaks.multi_hit should be defined');
  assert(stats.streaks.hr !== undefined, 'streaks.hr should be defined');
  const missing = loader.getByName('Nonexistent Hitter');
  assert(missing === undefined, 'Unknown hitter should return undefined');
  console.log('All hitter splits tests passed!');
}

try {
  testHitterStatsLoader();
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
