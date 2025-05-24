import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PredictorModel } from './predictorModel.ts';
import { HitterStatsLoader } from '../../mlb-data/hitter-stats-loader';

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
  const scheduleUrl = `${MLB_API_BASE}/schedule?sportId=1&date=${today}&hydrate=probablePitcher,team,linescore,lineups`;
  const resp = await axios.get(scheduleUrl);
  const games = resp.data.dates[0]?.games || [];
  const predictions: any[] = [];

  // Load advanced hitter splits for today
  const hitterStatsLoader = new HitterStatsLoader();

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

    // --- Integrate advanced hitter splits into team stats ---
    // Assume lineups are available in game.lineups.home and game.lineups.away as arrays of hitter names
    const homeLineup = game.lineups?.home || [];
    const awayLineup = game.lineups?.away || [];
    // For each hitter, load advanced splits from HitterStatsLoader
    const homeBattingStats = homeLineup.map((hitterName: string) => hitterStatsLoader.getByName(hitterName)).filter(Boolean);
    const awayBattingStats = awayLineup.map((hitterName: string) => hitterStatsLoader.getByName(hitterName)).filter(Boolean);

    // Aggregate features (example: average vs_hand OPS vs LHP/RHP, streaks, etc.)
    function avgVsHand(battingStats: any[], hand: 'L'|'R') {
      const opsList = battingStats.map(h => h?.vs_hand?.[hand]?.OPS ?? 0).filter(Number.isFinite);
      return opsList.length ? opsList.reduce((a, b) => a + b, 0) / opsList.length : 0;
    }
    function avgStreak(battingStats: any[], streak: keyof typeof homeBattingStats[0]['streaks']) {
      const streakList = battingStats.map(h => h?.streaks?.[streak] ?? 0).filter(Number.isFinite);
      return streakList.length ? streakList.reduce((a, b) => a + b, 0) / streakList.length : 0;
    }

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
        }] : [],
        batting: homeBattingStats // <-- NEW: full advanced splits for each hitter
      },
      // Example: add aggregated advanced splits as top-level features
      avgOPSvsLHP: avgVsHand(homeBattingStats, 'L'),
      avgOPSvsRHP: avgVsHand(homeBattingStats, 'R'),
      avgHitStreak: avgStreak(homeBattingStats, 'hit'),
      avgOnBaseStreak: avgStreak(homeBattingStats, 'on_base'),
      avgMultiHitStreak: avgStreak(homeBattingStats, 'multi_hit'),
      avgHRStreak: avgStreak(homeBattingStats, 'hr')
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
        }] : [],
        batting: awayBattingStats
      },
      avgOPSvsLHP: avgVsHand(awayBattingStats, 'L'),
      avgOPSvsRHP: avgVsHand(awayBattingStats, 'R'),
      avgHitStreak: avgStreak(awayBattingStats, 'hit'),
      avgOnBaseStreak: avgStreak(awayBattingStats, 'on_base'),
      avgMultiHitStreak: avgStreak(awayBattingStats, 'multi_hit'),
      avgHRStreak: avgStreak(awayBattingStats, 'hr')
    } as any;
    // --- End advanced hitter splits integration ---

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
