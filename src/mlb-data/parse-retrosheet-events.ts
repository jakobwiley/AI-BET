// Prototype parser for Retrosheet event files (EVN/EVA)
// Focus: extract assists, errors, double plays, range factor for one team (e.g., NYY)
import fs from 'fs';
import path from 'path';

/**
 * Parses a Retrosheet event file and aggregates defensive stats for a specified team.
 * @param {string} eventFilePath - Path to a .EVN or .EVA file
 * @param {string} teamAbbr - Team abbreviation (e.g., 'NYA' for Yankees)
 */
export function parseRetrosheetEventFile(eventFilePath: string, teamAbbr: string) {
  const lines = fs.readFileSync(eventFilePath, 'utf8').split(/\r?\n/);
  let assists = 0;
  let errors = 0;
  let doublePlays = 0;
  let putouts = 0;
  let defensiveInnings = 0;
  let currentFieldingTeam = '';
  let outsInInning = 0;

  for (const line of lines) {
    if (line.startsWith('start') || line.startsWith('sub')) {
      // Could be used for by-position mapping
      continue;
    }
    if (line.startsWith('info,batting_team')) {
      // Switch fielding team at half-inning
      const parts = line.split(',');
      currentFieldingTeam = parts[2];
      outsInInning = 0;
      continue;
    }
    if (line.startsWith('play')) {
      const parts = line.split(',');
      const fieldingTeam = currentFieldingTeam;
      if (fieldingTeam !== teamAbbr) continue;
      const event = parts[6];
      // Count outs for defensive innings
      if (event.match(/^(?:K|[0-9]+|W|IW|HP|E)/)) {
        // If an out is made, increment outsInInning
        if (event.match(/^(?:K|[0-9]+|E)/)) {
          outsInInning++;
          if (outsInInning === 3) {
            defensiveInnings++;
            outsInInning = 0;
          }
        }
      }
      // Assists: look for numbers before putout (e.g., 6-4-3 DP)
      const assistMatch = event.match(/([1-9])-([1-9])(-[1-9])*/);
      if (assistMatch) {
        assists += (event.match(/-/g) || []).length; // crude count
      }
      // Errors: look for E# or 'E' in event
      if (event.includes('E')) errors++;
      // Double plays: look for 'DP' or 'GDP'
      if (event.includes('DP') || event.includes('GDP')) doublePlays++;
      // Putouts: crude estimate by outs
      if (event.match(/^(?:K|[0-9]+|E)/)) putouts++;
    }
  }
  return {
    assists,
    errors,
    doublePlays,
    putouts,
    defensiveInnings,
    rangeFactor: defensiveInnings > 0 ? (putouts + assists) / defensiveInnings : null
  };
}

// Example usage (replace with actual path and team):
// const stats = parseRetrosheetEventFile('./data/retrosheet/2024/2024NYA.EVN', 'NYA');
// console.log(stats);
