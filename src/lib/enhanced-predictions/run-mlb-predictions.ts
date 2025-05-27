import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PredictorModel } from './predictorModel.ts';
import { HitterStatsLoader } from '../../mlb-data/hitter-stats-loader.ts';
import { EnhancedDefenseStatsLoader } from './enhancedDefenseStatsLoader.ts';

// --- Config ---
const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const today = new Date().toISOString().slice(0, 10);
const pitcherStatsPath = path.resolve(DATA_DIR, 'pitcherStats.json');
const fangraphsStatsPath = path.resolve(DATA_DIR, 'fangraphsPitchers.json');
const outputPath = path.resolve(DATA_DIR, `mlbPredictions_${today}.json`);

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

  // Load enhanced defense stats ONCE
  const enhancedDefenseStats = EnhancedDefenseStatsLoader.loadStats();

  let firstGameAudit = false;
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
    let homeLineup = game.lineups?.home || [];
    let awayLineup = game.lineups?.away || [];
    // Fallback: if lineup is empty, attempt to load roster from API
    if (!homeLineup.length) {
      try {
        const rosterResp = await axios.get(`${MLB_API_BASE}/teams/${game.teams.home.team.id}/roster`);
        homeLineup = rosterResp.data.roster?.map((p: any) => p.person.fullName) || [];
        if (!homeLineup.length) {
          console.warn(`[WARN] No lineup or roster available for ${homeTeam}. Advanced hitter metrics will be missing.`);
        } else {
          console.log(`[DEBUG] Used roster as fallback lineup for ${homeTeam}:`, homeLineup);
        }
      } catch (err) {
        console.warn(`[WARN] Failed to fetch roster for ${homeTeam}:`, err?.message || err);
      }
    }
    if (!awayLineup.length) {
      try {
        const rosterResp = await axios.get(`${MLB_API_BASE}/teams/${game.teams.away.team.id}/roster`);
        awayLineup = rosterResp.data.roster?.map((p: any) => p.person.fullName) || [];
        if (!awayLineup.length) {
          console.warn(`[WARN] No lineup or roster available for ${awayTeam}. Advanced hitter metrics will be missing.`);
        } else {
          console.log(`[DEBUG] Used roster as fallback lineup for ${awayTeam}:`, awayLineup);
        }
      } catch (err) {
        console.warn(`[WARN] Failed to fetch roster for ${awayTeam}:`, err?.message || err);
      }
    }
    // For each hitter, load advanced splits from HitterStatsLoader
    // For the first game, log unmatched hitters for debugging
    if (!firstGameAudit) {
      console.log(`\n[DEBUG] Home lineup for ${homeTeam}:`, homeLineup);
      for (const hitterName of homeLineup) {
        const stats = hitterStatsLoader.getByName(hitterName);
        if (!stats) {
          const fuzzy = hitterStatsLoader.getByNameFuzzy(hitterName);
          console.log(`[DEBUG] Home hitter not matched: '${hitterName}' | Fuzzy matches:`, fuzzy);
        }
      }
      console.log(`[DEBUG] Away lineup for ${awayTeam}:`, awayLineup);
      for (const hitterName of awayLineup) {
        const stats = hitterStatsLoader.getByName(hitterName);
        if (!stats) {
          const fuzzy = hitterStatsLoader.getByNameFuzzy(hitterName);
          console.log(`[DEBUG] Away hitter not matched: '${hitterName}' | Fuzzy matches:`, fuzzy);
        }
      }
    }
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

    // --- Integrate enhanced defense stats ---
    const homeDefense = EnhancedDefenseStatsLoader.getStatsForTeam(homeTeam);
    const awayDefense = EnhancedDefenseStatsLoader.getStatsForTeam(awayTeam);

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
        batting: homeBattingStats
      },
      avgOPSvsLHP: avgVsHand(homeBattingStats, 'L'),
      avgOPSvsRHP: avgVsHand(homeBattingStats, 'R'),
      avgHitStreak: avgStreak(homeBattingStats, 'hit'),
      avgOnBaseStreak: avgStreak(homeBattingStats, 'on_base'),
      avgMultiHitStreak: avgStreak(homeBattingStats, 'multi_hit'),
      avgHRStreak: avgStreak(homeBattingStats, 'hr'),
      // Enhanced defense stats
      oaa: homeDefense?.oaa ?? null,
      fielding_pct: homeDefense?.fielding_pct ?? null,
      errors: homeDefense?.errors ?? null,
      assists: homeDefense?.assists ?? null,
      putouts: homeDefense?.putouts ?? null
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
      avgHRStreak: avgStreak(awayBattingStats, 'hr'),
      // Enhanced defense stats
      oaa: awayDefense?.oaa ?? null,
      fielding_pct: awayDefense?.fielding_pct ?? null,
      errors: awayDefense?.errors ?? null,
      assists: awayDefense?.assists ?? null,
      putouts: awayDefense?.putouts ?? null
    } as any;
    // --- End enhanced defense stats integration ---
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
      homeStats,
      awayStats,
      factors,
      confidence
    });

    // For the first game only, write a detailed audit object
    if (!firstGameAudit) {
      const auditObj = {
        homeTeam,
        awayTeam,
        homePitcher: homePitcherName,
        awayPitcher: awayPitcherName,
        homeStats,
        awayStats,
        factors,
        confidence
      };
      fs.writeFileSync(
        path.resolve(DATA_DIR, `mlbPredictions_audit_single_game.json`),
        JSON.stringify([auditObj], null, 2)
      );
      firstGameAudit = true;
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(predictions, null, 2));
  console.log(`Predictions for ${today} saved to ${outputPath}`);

  // --- Run audit script after predictions ---
  const { execSync } = require('child_process');
  try {
    const auditResult = execSync('npx ts-node scripts/audit-datapoints.ts ' + outputPath, { encoding: 'utf-8' });
    console.log('\n[POST-PREDICTION AUDIT REPORT]\n' + auditResult);
    if (auditResult.includes('missing')) {
      console.warn('[AUDIT WARNING] Some datapoints are missing. Review the audit report above.');
    } else {
      console.log('[AUDIT SUCCESS] All datapoints present.');
    }
  } catch (err) {
    console.error('[AUDIT ERROR] Failed to run audit script:', err);
  }
}

main().catch(console.error);
