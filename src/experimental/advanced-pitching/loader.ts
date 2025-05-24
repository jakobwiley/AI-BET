import fs from 'fs';

export function loadPitcherStatsFromJson(path: string) {
  const raw = fs.readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}
