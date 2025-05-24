import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PredictorModel } from './predictorModel.ts';

// --- Config ---
const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const today = new Date().toISOString().slice(0, 10);
const pitcherStatsPath = path.resolve(__dirname, '../../data/pitcherStats.json');
const fangraphsStatsPath = path.resolve(__dirname, '../../data/fangraphsPitchers.json');
const outputPath = path.resolve(__dirname, `../../data/mlbPredictions_${today}.json`);

// --- Load Data ---
function loadJson(file: string) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const pitcherStats = loadJson(pitcherStatsPath);
const fangraphsStats = loadJson(fangraphsStatsPath);

function findPitcherByName(name: string) {
  // Try exact, then case-insensitive, then partial
  let p = pitcherStats.find((x: any) => x.name === name);
  if (!p) p = pitcherStats.find((x: any) => x.name.toLowerCase() === name.toLowerCase());
  if (!p) p = pitcherStats.find((x: any) => x.name.split(' ')[0] === name.split(' ')[0]);
  return p;
}

function findFangraphsByName(name: string) {
  let p = fangraphsStats.find((x: any) => x.Name === name);
  if (!p) p = fangraphsStats.find((x: any) => x.Name.toLowerCase() === name.toLowerCase());
  if (!p) p = fangraphsStats.find((x: any) => x.Name.split(' ')[0] === name.split(' ')[0]);
  return p;
}

// --- Main ---
async function main() {
  // 1. Get today's games
  const scheduleUrl = `${MLB_API_BASE}/schedule?sportId=1&date=${today}&hydrate=probablePitcher,team,linescore`;
  const resp = await axios.get(scheduleUrl);
  const games = resp.data.dates[0]?.games || [];
  const predictions: any[] = [];

  for (const game of games) {
    const homeTeam = game.teams.home.team.name;
    const awayTeam = game.teams.away.team.name;
    const homePitcherName = game.teams.home.probablePitcher?.fullName;
    const awayPitcherName = game.teams.away.probablePitcher?.fullName;

    // Find pitcher stats
    const homePitcher = homePitcherName ? findPitcherByName(homePitcherName) : null;
    const awayPitcher = awayPitcherName ? findPitcherByName(awayPitcherName) : null;
    const homeFangraphs = homePitcherName ? findFangraphsByName(homePitcherName) : null;
    const awayFangraphs = awayPitcherName ? findFangraphsByName(awayPitcherName) : null;

    // Construct TeamStats (minimal for demo; expand as needed)
    const homeStats = {
      wins: game.teams.home.leagueRecord.wins,
      losses: game.teams.home.leagueRecord.losses,
      teamERA: homePitcher?.era?.toString() ?? undefined,
      keyPlayers: {
        pitching: homePitcher ? [{
          era: homePitcher.era?.toString() ?? '',
          whip: homePitcher.whip?.toString() ?? '',
          fip: homePitcher.fip?.toString() ?? '',
          war: homeFangraphs?.WAR?.toString() ?? ''
        }] : []
      }
    } as any;
    const awayStats = {
      wins: game.teams.away.leagueRecord.wins,
      losses: game.teams.away.leagueRecord.losses,
      teamERA: awayPitcher?.era?.toString() ?? undefined,
      keyPlayers: {
        pitching: awayPitcher ? [{
          era: awayPitcher.era?.toString() ?? '',
          whip: awayPitcher.whip?.toString() ?? '',
          fip: awayPitcher.fip?.toString() ?? '',
          war: awayFangraphs?.WAR?.toString() ?? ''
        }] : []
      }
    } as any;

    // Dummy H2H
    const h2hStats = null;

    // Use the prediction model
    const factors = PredictorModel.calculateEnhancedFactors(homeStats, awayStats, h2hStats, {
      sport: 'MLB',
      homeTeamName: homeTeam,
      awayTeamName: awayTeam
    });
    const confidence = PredictorModel.calculateConfidence('SPREAD', factors);

    predictions.push({
      homeTeam,
      awayTeam,
      homePitcher: homePitcherName,
      awayPitcher: awayPitcherName,
      factors,
      confidence
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(predictions, null, 2));
  console.log(`Predictions for ${today} saved to ${outputPath}`);
}

main().catch(console.error);
