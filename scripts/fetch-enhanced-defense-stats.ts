// Scalable script to download, extract, and aggregate enhanced defensive stats for all MLB teams from Retrosheet event files
import { downloadAndExtractRetrosheetEvents } from '../src/mlb-data/retrosheet-utils.ts';
import { parseRetrosheetEventFile } from '../src/mlb-data/parse-retrosheet-events.ts';
import fs from 'fs';
import path from 'path';

// NOTE: Default season is set to 2025 (current MLB season). Update if Retrosheet 2025 data is not yet available.
async function main(season = 2025) {
  // Download and extract event files
  const extractDir = await downloadAndExtractRetrosheetEvents(season, './data/retrosheet');
  const files = fs.readdirSync(extractDir).filter(f => f.endsWith('.EVN') || f.endsWith('.EVA'));

  // Map of teamAbbr => aggregated stats
  const teamStats: Record<string, any> = {};

  for (const file of files) {
    const filePath = path.join(extractDir, file);
    // Extract team abbreviation from filename (e.g., 2024NYA.EVN => NYA)
    const match = file.match(/\d{4}([A-Z]{3})\./);
    if (!match) continue;
    const teamAbbr = match[1];
    const stats = parseRetrosheetEventFile(filePath, teamAbbr);
    if (!teamStats[teamAbbr]) {
      teamStats[teamAbbr] = { ...stats, team: teamAbbr, season };
    } else {
      // Aggregate across multiple files if needed
      Object.keys(stats).forEach(key => {
        if (typeof stats[key] === 'number') {
          teamStats[teamAbbr][key] += stats[key];
        }
      });
    }
  }

  // Convert to array and output as JSON
  const outArr = Object.values(teamStats);
  const outPath = path.resolve('./data/enhanced_defense_stats_' + season + '.json');
  fs.writeFileSync(outPath, JSON.stringify(outArr, null, 2));
  console.log(`Enhanced defense stats for ${season} saved to ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
