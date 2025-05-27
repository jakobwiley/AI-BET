// Loader for enhanced defensive stats JSON output
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnhancedDefenseStats(date?: string) {
  const today = date || new Date().toISOString().slice(0, 10);
  const statsPath = path.resolve(__dirname, '../../data/enhanced_defense_stats_' + today + '.json');
  return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
}
