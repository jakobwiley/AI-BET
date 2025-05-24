/**
 * Loads MLB hitter splits and streaks for probable lineups from the JSON file produced by the splits/streaks script.
 * Returns a map of mlbam_id -> splits/streaks object for fast lookup.
 */
import fs from 'fs';
import path from 'path';

export interface HitterSplits {
  name: string;
  splits: Record<string, any>; // vsLHP, vsRHP, home, away
  streaks: Record<string, any>; // last7, last14, last30
}

export function loadHitterSplitsStreaks(date: string): Record<string, HitterSplits> {
  const dataPath = path.resolve(__dirname, `../../data/hitter_splits_streaks_${date}.json`);
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Hitter splits/streaks file not found: ${dataPath}`);
  }
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);
  return data as Record<string, HitterSplits>;
}

/**
 * Given a lineup array [{ mlbam_id, ... }], returns an array of splits/streaks objects for each hitter.
 * If a hitter is missing, returns null for that entry.
 */
export function getLineupSplits(lineup: { mlbam_id: string }[], splitsMap: Record<string, HitterSplits>) {
  return lineup.map(hitter => splitsMap[hitter.mlbam_id] || null);
}
