import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');
const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
const latest = files.filter(f => f.startsWith('enhanced_defense_stats_')).sort().reverse()[0];
if (!latest) throw new Error('No enhanced defense stats output found in /data');
const filePath = path.join(dataDir, latest);

console.log(`[TEST] Loading enhanced defense stats from: ${filePath}`);
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

assert(Array.isArray(data), 'Output should be an array');
assert(data.length > 0, 'Output array should not be empty');

const sample = data.find(row => row.oaa !== null);
assert(sample, 'At least one team should have a non-null OAA');

for (const row of data) {
  assert(typeof row.team === 'string' && row.team.length > 0, 'Each row should have a team name');
  assert(typeof row.season === 'number', 'Each row should have a numeric season');
  assert(row.oaa === null || typeof row.oaa === 'number', 'OAA should be null or a number');
  assert(typeof row.errors === 'number', 'Errors should be a number');
  assert(typeof row.assists === 'number', 'Assists should be a number');
  assert(typeof row.putouts === 'number', 'Putouts should be a number');
  assert(typeof row.doublePlays === 'number', 'DoublePlays should be a number');
  assert(typeof row.fieldingPct === 'number' || row.fieldingPct === null, 'FieldingPct should be a number or null');
}

console.log('[TEST PASSED] Enhanced defense stats output is valid.');
