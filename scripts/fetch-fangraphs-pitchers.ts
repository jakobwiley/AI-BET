// Script: Fetch advanced pitcher stats from FanGraphs (public CSV endpoint or web scraping)
// This script will fetch FIP, xFIP, SIERA, K/BB, etc. for all MLB pitchers for the current season
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';

interface FanGraphsPitcher {
  Name: string;
  Team: string;
  Season: string;
  GS: string;
  IP: string;
  ERA: string;
  FIP: string;
  xFIP: string;
  SIERA: string;
  K_BB: string;
  WHIP: string;
  Hand: string;
}

// FanGraphs leaderboard CSV URL for advanced pitcher stats (2025 season, all MLB starters)
const FG_CSV_LOCAL = path.join(path.dirname(new URL(import.meta.url).pathname), '../data/fangraphsPitchers.csv');

async function fetchFanGraphsPitchers(): Promise<FanGraphsPitcher[]> {
  if (!fs.existsSync(FG_CSV_LOCAL)) {
    console.error('FanGraphs CSV not found.');
    console.log('Please download the advanced pitcher stats CSV for the current MLB season from:');
    console.log('https://www.fangraphs.com/leaders.aspx?pos=all&stats=pit&type=1&season=2025&team=all&lg=all&qual=0&csv=1');
    console.log('Save the file as data/fangraphsPitchers.csv and re-run this script.');
    process.exit(1);
  }
  const csv = fs.readFileSync(FG_CSV_LOCAL, 'utf8');
  const records: FanGraphsPitcher[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  });
  // Validate the output is an array
  if (!Array.isArray(records)) {
    throw new Error('Parsed FanGraphs CSV is not an array. Please check the CSV file format.');
  }
  return records;
}

async function main() {
  const date = process.argv[2] || new Date().toISOString().slice(0, 10);
  const pitchers = await fetchFanGraphsPitchers();
  // Only write the array of pitcher records
  const outPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../data/fangraphsPitchers.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(pitchers, null, 2), 'utf8');
  console.log(`FanGraphs pitcher stats saved to ${outPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
