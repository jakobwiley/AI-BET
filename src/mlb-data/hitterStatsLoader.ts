import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to normalize and strip accents from names
function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z .'-]/g, '');
}

/**
 * Loads advanced stats for a list of hitter names for a given year.
 * Returns an array of stats objects, in the same order as the input names.
 */
export function loadAdvancedHitterStats(hitterNames: string[], year: string | number) {
  const statsPath = path.resolve(__dirname, `../../data/hitter_advanced_stats_${year}.json`);
  const allStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  const normalizedStatsMap = new Map(
    allStats.map((p: any) => [normalizeName(p.Name), p])
  );
  return hitterNames.map(name => normalizedStatsMap.get(normalizeName(name)) || null);
}
