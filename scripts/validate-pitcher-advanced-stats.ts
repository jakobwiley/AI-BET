// Validates that all probable pitchers in the schedule have advanced stats in the canonical JSON
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const today = process.argv[2] || new Date().toISOString().slice(0, 10);
const schedulePath = path.resolve(__dirname, `../data/mlb_schedule_${today}.json`);
const statsPath = path.resolve(__dirname, `../data/pitcher_advanced_stats_${today.slice(0,4)}.json`);

const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
const allStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

// Helper to normalize and strip accents from names
function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z .'-]/g, ''); // Keep letters, spaces, dots, hyphens, apostrophes
}

const probablePitchers = Array.from(new Set([
  ...schedule.map((g: any) => g.homeProbablePitcher),
  ...schedule.map((g: any) => g.awayProbablePitcher)
])).filter(Boolean);

const normalizedStatsNames = allStats.map((p: any) => normalizeName(p.Name));
const missing = probablePitchers.filter(name => !normalizedStatsNames.includes(normalizeName(name)));

if (missing.length === 0) {
  console.log('✅ All probable pitchers have advanced stats for', today);
} else {
  console.log('❌ Missing advanced stats for:', missing);
  process.exit(1);
}
