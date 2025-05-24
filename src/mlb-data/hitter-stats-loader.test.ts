import { HitterStatsLoader } from './hitter-stats-loader.js';

describe('HitterStatsLoader Integration', () => {
  let loader: HitterStatsLoader;

  beforeAll(() => {
    loader = new HitterStatsLoader();
  });

  it('should load hitter stats with vs_hand splits', () => {
    const stats = loader.getByName('Aaron Judge');
    expect(stats).toBeDefined();
    expect(stats.vs_hand).toBeDefined();
    expect(stats.vs_hand.L).toBeDefined();
    expect(stats.vs_hand.R).toBeDefined();
    // OPS should be a number or string convertible to number
    expect(Number(stats.vs_hand.L.OPS)).not.toBeNaN();
    expect(Number(stats.vs_hand.R.OPS)).not.toBeNaN();
  });

  it('should load hitter stats with recent splits', () => {
    const stats = loader.getByName('Aaron Judge');
    expect(stats).toBeDefined();
    expect(stats.recent).toBeDefined();
    expect(stats.recent['7']).toBeDefined();
    expect(stats.recent['14']).toBeDefined();
    expect(stats.recent['30']).toBeDefined();
  });

  it('should load hitter stats with streaks', () => {
    const stats = loader.getByName('Aaron Judge');
    expect(stats).toBeDefined();
    expect(stats.streaks).toBeDefined();
    expect(stats.streaks.hit).toBeDefined();
    expect(stats.streaks.on_base).toBeDefined();
    expect(stats.streaks.multi_hit).toBeDefined();
    expect(stats.streaks.hr).toBeDefined();
  });

  it('should return undefined for unknown hitter', () => {
    const stats = loader.getByName('Nonexistent Hitter');
    expect(stats).toBeUndefined();
  });
});
