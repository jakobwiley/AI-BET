import { PrismaClient, GameStatus } from '@prisma/client';
import { format } from 'date-fns';
import dotenv from 'dotenv';
import EmailService from '../src/lib/emailService';
import { createInterface } from 'readline/promises';
import { getYesterdaysResults, formatResultsSummary } from './get-yesterdays-results';
import { execSync } from 'child_process';
import { populateTeamStats } from './populate-team-stats';

dotenv.config();

const prisma = new PrismaClient();

interface Prediction {
  id: string;
  gameId: string;
  predictionType: 'SPREAD' | 'TOTAL' | 'MONEYLINE';
  predictionValue: string;
  confidence: number;
  reasoning: string;
  outcome: 'PENDING' | 'WIN' | 'LOSS' | 'PUSH';
  createdAt: Date;
  updatedAt: Date;
  projectionJson?: {
    projectedTeam?: string;
    projectedMargin?: number;
    projectedHome?: number;
    projectedAway?: number;
    projectedTotal?: number;
    projectedWinner?: string;
    winProbability?: number;
  };
}

interface Game {
  id: string;
  sport: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  gameDate: Date;
  status: GameStatus;
  oddsJson: any;
  predictions: Prediction[];
}

// MLB team name to abbreviation mapping
const MLB_TEAM_NAME_TO_ID: Record<string, string> = {
  'Arizona Diamondbacks': 'ARI',
  'Atlanta Braves': 'ATL',
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'Chicago Cubs': 'CHC',
  'Chicago White Sox': 'CWS',
  'Cincinnati Reds': 'CIN',
  'Cleveland Guardians': 'CLE',
  'Colorado Rockies': 'COL',
  'Detroit Tigers': 'DET',
  'Houston Astros': 'HOU',
  'Kansas City Royals': 'KCR',
  'Los Angeles Angels': 'LAA',
  'Los Angeles Dodgers': 'LAD',
  'Miami Marlins': 'MIA',
  'Milwaukee Brewers': 'MIL',
  'Minnesota Twins': 'MIN',
  'New York Mets': 'NYM',
  'New York Yankees': 'NYY',
  'Oakland Athletics': 'OAK',
  'Philadelphia Phillies': 'PHI',
  'Pittsburgh Pirates': 'PIT',
  'San Diego Padres': 'SDP',
  'San Francisco Giants': 'SFG',
  'Seattle Mariners': 'SEA',
  'St. Louis Cardinals': 'STL',
  'Tampa Bay Rays': 'TBR',
  'Texas Rangers': 'TEX',
  'Toronto Blue Jays': 'TOR',
  'Washington Nationals': 'WSN',
};

function getTeamId(teamName: string, fallbackId: string): string {
  return MLB_TEAM_NAME_TO_ID[teamName] || fallbackId;
}

function getConfidenceGrade(confidence: number): string {
  if (confidence >= 0.85) return 'A+';
  if (confidence >= 0.80) return 'A';
  if (confidence >= 0.75) return 'A-';
  if (confidence >= 0.70) return 'B+';
  return 'B';
}

function formatPrediction(prediction: Prediction, game: Game): string {
  const predictionValueNum = Number(prediction.predictionValue);
  const confidencePct = Math.round(prediction.confidence * 100);
  if (prediction.predictionType === 'SPREAD') {
    const spreadValue = Math.abs(predictionValueNum);
    const isFavorite = predictionValueNum < 0;
    const lineTeam = isFavorite ? game.homeTeamName : game.awayTeamName;
    const lineSign = isFavorite ? '-' : '+';
    let out = '';
    out += `SPREAD: ${lineTeam} ${lineSign}${spreadValue}\n`;
    if (prediction.projectionJson) {
      out += `PREDICTION: Take ${prediction.projectionJson.projectedTeam} - ${prediction.projectionJson.projectedTeam} by ${prediction.projectionJson.projectedMargin} - Confidence: ${confidencePct}%\n`;
    }
    return out.trim();
  }
  // MONEYLINE
  else if (prediction.predictionType === 'MONEYLINE') {
    const lineTeam = predictionValueNum > 0 ? game.homeTeamName : game.awayTeamName;
    let out = `Betting Line & Odds: ${lineTeam} ML\n`;
    if (prediction.projectionJson) {
      out += `PREDICTION: Take ${prediction.projectionJson.projectedWinner} - ${prediction.projectionJson.projectedWinner} (Confidence: ${confidencePct}%)\n`;
    }
    return out.trim();
  }
  // TOTAL
  else if (prediction.predictionType === 'TOTAL') {
    const totalMatch = prediction.predictionValue.match(/(OVER|UNDER)\s*(\d+(\.\d+)?)/i);
    let lineDirection = '';
    let lineValue = '';
    if (totalMatch) {
      lineDirection = totalMatch[1].toUpperCase();
      lineValue = totalMatch[2];
    } else {
      lineDirection = prediction.predictionValue;
      lineValue = '';
    }
    let out = `Betting Line & Odds: ${lineDirection} ${lineValue}\n`;
    if (prediction.projectionJson) {
      out += `PREDICTION: Take ${lineDirection.charAt(0) + lineDirection.slice(1).toLowerCase()} - ${prediction.projectionJson.projectedHome}-${prediction.projectionJson.projectedAway} (Total: ${prediction.projectionJson.projectedTotal}, Confidence: ${confidencePct}%)\n`;
    }
    return out.trim();
  }
  return '';
}

// Improved reasoning: show detailed stats and model warning
function buildReasoning(prediction: Prediction, game: Game, teamStatsMap: any): string {
  const homeId = getTeamId(game.homeTeamName, game.homeTeamId);
  const awayId = getTeamId(game.awayTeamName, game.awayTeamId);
  let homeStatsRaw = teamStatsMap[homeId]?.statsJson;
  let awayStatsRaw = teamStatsMap[awayId]?.statsJson;
  const homeStats = typeof homeStatsRaw === 'string' ? JSON.parse(homeStatsRaw) : homeStatsRaw;
  const awayStats = typeof awayStatsRaw === 'string' ? JSON.parse(awayStatsRaw) : awayStatsRaw;
  let points: string[] = [];
  // Always use top-level MLB stats if present
  if (homeStats && awayStats &&
      (typeof homeStats.wins === 'number' || typeof awayStats.wins === 'number')) {
    const hw = homeStats.wins ?? 0;
    const hl = homeStats.losses ?? 0;
    const hr = homeStats.runsScored ?? 0;
    const hg = homeStats.gamesPlayed ?? 0;
    const ha = homeStats.avgRunsScored ?? 0;
    const aw = awayStats.wins ?? 0;
    const al = awayStats.losses ?? 0;
    const ar = awayStats.runsScored ?? 0;
    const ag = awayStats.gamesPlayed ?? 0;
    const aa = awayStats.avgRunsScored ?? 0;
    points.push(
      `${game.homeTeamName} season: ${hw}-${hl} (Runs: ${hr}, Games: ${hg}, Avg Runs: ${ha})`,
      `${game.awayTeamName} season: ${aw}-${al} (Runs: ${ar}, Games: ${ag}, Avg Runs: ${aa})`
    );
  } else if (homeStats && awayStats && homeStats.lastNGames && awayStats.lastNGames) {
    points.push(
      `${game.homeTeamName} recent: ${homeStats.lastNGames.wins}-${homeStats.lastNGames.losses} (Runs: ${homeStats.lastNGames.runsScored}-${homeStats.lastNGames.runsAllowed})`,
      `${game.awayTeamName} recent: ${awayStats.lastNGames.wins}-${awayStats.lastNGames.losses} (Runs: ${awayStats.lastNGames.runsScored}-${awayStats.lastNGames.runsAllowed})`
    );
    if (homeStats.homeStats && awayStats.awayStats) {
      points.push(
        `${game.homeTeamName} home: ${homeStats.homeStats.wins}-${homeStats.homeStats.losses} (Runs: ${homeStats.homeStats.runsScored}-${homeStats.homeStats.runsAllowed})`,
        `${game.awayTeamName} away: ${awayStats.awayStats.wins}-${awayStats.awayStats.losses} (Runs: ${awayStats.awayStats.runsScored}-${awayStats.awayStats.runsAllowed})`
      );
    }
  }
  // Add model warning if present
  if (prediction.reasoning && !/^SPREAD|MONEYLINE|TOTAL/.test(prediction.reasoning)) {
    points.push(prediction.reasoning);
  }
  return points.map(p => `• ${p}`).join('\n');
}

function formatPredictions(games: Game[], teamStatsMap: any): string {
  let emailBody = '';
  
  // Group games by sport
  const gamesBySport = games.reduce((acc, game) => {
    if (!acc[game.sport]) {
      acc[game.sport] = [];
    }
    acc[game.sport].push(game);
    return acc;
  }, {} as Record<string, Game[]>);
  
  // Format each sport's predictions
  Object.entries(gamesBySport).forEach(([sport, sportGames]) => {
    emailBody += `\n${sport.toUpperCase()} PREDICTIONS\n`;
    emailBody += '='.repeat(sport.length + 12) + '\n\n';
    
    // Group predictions by grade
    const predictionsByGrade = sportGames.reduce((acc, game) => {
      game.predictions.forEach(prediction => {
        const grade = getConfidenceGrade(prediction.confidence);
        if (!acc[grade]) {
          acc[grade] = [];
        }
        acc[grade].push({ game, prediction });
      });
      return acc;
    }, {} as Record<string, Array<{ game: Game; prediction: Prediction }>>);
    
    // Sort grades (A+ to B+)
    const sortedGrades = Object.keys(predictionsByGrade).sort((a, b) => {
      const gradeOrder = { 'A+': 0, 'A': 1, 'A-': 2, 'B+': 3 };
      return gradeOrder[a as keyof typeof gradeOrder] - gradeOrder[b as keyof typeof gradeOrder];
    });
    
    // Format predictions by grade
    sortedGrades.forEach(grade => {
      emailBody += `\nGrade ${grade} Predictions:\n`;
      emailBody += '-'.repeat(20) + '\n\n';
      // Sort predictions within the grade by confidence descending
      const sortedPredictions = predictionsByGrade[grade].sort((a, b) => b.prediction.confidence - a.prediction.confidence);
      sortedPredictions.forEach(({ game, prediction }) => {
        const gameTime = format(new Date(game.gameDate), 'h:mm a');
        // New header for each game
        emailBody += `GAME: ${game.awayTeamName} @ ${game.homeTeamName} (${gameTime} CT)\n`;
        emailBody += formatPrediction(prediction, game) + '\n';
        emailBody += 'Reasoning:\n';
        emailBody += buildReasoning(prediction, game, teamStatsMap) + '\n';
        emailBody += '\n';
      });
    });
  });
  
  return emailBody;
}

async function main() {
  await populateTeamStats();
  try {
    // Step 1: Update yesterday's prediction outcomes before summarizing
    console.log('Running analyze-yesterday-predictions.ts to update outcomes...');
    execSync('npx tsx scripts/analyze-yesterday-predictions.ts', { stdio: 'inherit' });
    console.log('Outcome update complete. Proceeding to email generation.');

    const emailService = new EmailService();
    await emailService.verifyConnection();

    // Get yesterday's results and format summary
    const yesterdaysSummary = await getYesterdaysResults();
    const yesterdaysResultsText = formatResultsSummary(yesterdaysSummary);

    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        },
        status: GameStatus.SCHEDULED
      },
      include: {
        predictions: true
      }
    });

    if (games.length === 0) {
      console.log('No games with predictions found for today');
      return;
    }

    // Fetch all team stats for today
    const teamStatsRecords = await prisma.teamStats.findMany({ where: { sport: 'MLB' } });
    const teamStatsMap = Object.fromEntries(teamStatsRecords.map(ts => [ts.teamId, ts]));

    // Log missing stats for teams in today's games
    const missingStatsTeams = new Set<string>();
    games.forEach(game => {
      const homeId = getTeamId(game.homeTeamName, game.homeTeamId);
      const awayId = getTeamId(game.awayTeamName, game.awayTeamId);
      if (!teamStatsMap[homeId]) missingStatsTeams.add(`${game.homeTeamName} (${homeId})`);
      if (!teamStatsMap[awayId]) missingStatsTeams.add(`${game.awayTeamName} (${awayId})`);
    });
    if (missingStatsTeams.size > 0) {
      console.warn('Missing stats for the following teams:');
      missingStatsTeams.forEach(t => console.warn('  - ' + t));
    }

    // Format email body using grouping by grade
    let emailBody = yesterdaysResultsText + '\n' + formatPredictions(games, teamStatsMap);

    // Display predictions in console
    console.log('\n=== TODAY\'S PREDICTIONS ===\n');
    console.log(emailBody);
    console.log('\n===========================\n');
    
    // Send the email automatically, no prompt
    await emailService.sendEmail({
      to: 'jakobwiley@gmail.com',
      subject: `Sports Betting Predictions - ${format(new Date(), 'MMMM d, yyyy')}`,
      body: emailBody
    });
    console.log('Predictions email sent successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();