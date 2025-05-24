/**
 * factorCalculator.ts
 *
 * Core logic for calculating advanced pitcher stats factors for MLB prediction models.
 * Standalone, robust, and modern. No legacy dependencies.
 */

export interface PitcherStats {
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

export interface TeamStats {
  team: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  pitcher: PitcherStats;
}

/**
 * Normalize a stat to a 0-1 scale (lower is better for ERA, FIP, etc.)
 */
function normalizeStat(value: number, min: number, max: number, invert = false): number {
  let norm = (value - min) / (max - min);
  if (invert) norm = 1 - norm;
  return Math.max(0, Math.min(1, norm));
}

/**
 * Calculate an advanced pitcher factor (0-1, higher is better).
 */
export function calculatePitcherFactor(stats: PitcherStats): number {
  // These min/max values can be tuned for the league context
  const eraScore = normalizeStat(stats.era, 1.5, 6.0, true);
  const whipScore = normalizeStat(stats.whip, 0.8, 1.7, true);
  const fipScore = normalizeStat(stats.fip, 2.0, 6.0, true);
  const xfipScore = normalizeStat(stats.xfip, 2.0, 6.0, true);
  const sieraScore = normalizeStat(stats.siera, 2.0, 5.5, true);
  const kbbScore = normalizeStat(stats.kbb, 1.5, 8.0, false);
  const warScore = normalizeStat(stats.war, 0, 8, false);

  // Weighted average (weights can be tuned)
  return (
    0.18 * eraScore +
    0.14 * whipScore +
    0.16 * fipScore +
    0.14 * xfipScore +
    0.14 * sieraScore +
    0.12 * kbbScore +
    0.12 * warScore
  );
}

/**
 * Compare two teams' pitcher factors and return a matchup factor (0-1, 0.5 = even)
 */
export function calculatePitcherMatchupFactor(home: TeamStats, away: TeamStats): number {
  const homeFactor = calculatePitcherFactor(home.pitcher);
  const awayFactor = calculatePitcherFactor(away.pitcher);
  // 0.5 = even, >0.5 favors home, <0.5 favors away
  return (homeFactor - awayFactor) * 0.5 + 0.5;
}

/**
 * Calculate bullpen factor (0-1, higher is better bullpen)
 */
export function calculateBullpenFactor(bullpenEra?: number): number {
  if (typeof bullpenEra !== 'number' || isNaN(bullpenEra)) {
    console.warn('Bullpen ERA missing or invalid, defaulting to league average (0.5)');
    return 0.5;
  }
  // Typical MLB bullpen ERA range: 2.5 (elite) to 5.5 (poor)
  return normalizeStat(bullpenEra, 2.5, 5.5, true);
}

/**
 * Calculate recent form factor (0-1, higher is better recent pitching)
 */
export function calculateRecentFormFactor(recentFormEra?: number): number {
  if (typeof recentFormEra !== 'number' || isNaN(recentFormEra)) {
    console.warn('Recent form ERA missing or invalid, defaulting to league average (0.5)');
    return 0.5;
  }
  // Typical recent form ERA range: 1.5 (hot) to 6.0 (cold)
  return normalizeStat(recentFormEra, 1.5, 6.0, true);
}
