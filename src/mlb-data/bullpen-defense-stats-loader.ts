// Loader for bullpen and defense stats
// Reads data/bullpen_defense_stats_<date>.json and exposes as TypeScript objects
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadBullpenDefenseStats(date?: string) {
  const today = date || new Date().toISOString().slice(0, 10);
  const statsPath = path.resolve(__dirname, '../../data/bullpen_defense_stats_' + today + '.json');
  return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
}
