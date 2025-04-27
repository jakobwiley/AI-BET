import { PrismaClient, GameStatus } from '@prisma/client';
import { format } from 'date-fns';
import dotenv from 'dotenv';
import EmailService from '../src/lib/emailService';
import { createInterface } from 'readline/promises';

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

function getConfidenceGrade(confidence: number): string {
  if (confidence >= 0.85) return 'A+';
  if (confidence >= 0.80) return 'A';
  if (confidence >= 0.75) return 'A-';
  if (confidence >= 0.70) return 'B+';
  return 'B';
}

function formatPrediction(prediction: Prediction, game: Game): string {
  let predictionLine = '';
  let modelLine = '';
  let warningLine = '';
  const predictionValueNum = Number(prediction.predictionValue);
  const confidencePct = Math.round(prediction.confidence * 100);
  // SPREAD
  if (prediction.predictionType === 'SPREAD') {
    const spreadValue = Math.abs(predictionValueNum);
    const isFavorite = predictionValueNum < 0;
    const lineTeam = isFavorite ? game.homeTeamName : game.awayTeamName;
    const lineSign = isFavorite ? '-' : '+';
    predictionLine = `Betting Line & Odds: ${lineTeam} ${lineSign}${spreadValue}`;
    if (prediction.projectionJson) {
      modelLine = `Model Pick: ${prediction.projectionJson.projectedTeam} by ${prediction.projectionJson.projectedMargin} (Confidence: ${confidencePct}%)`;
      if (prediction.projectionJson.projectedTeam !== lineTeam) {
        warningLine = '⚠️ Model disagrees with the betting line!';
      }
    }
  }
  // MONEYLINE
  else if (prediction.predictionType === 'MONEYLINE') {
    const lineTeam = predictionValueNum > 0 ? game.homeTeamName : game.awayTeamName;
    predictionLine = `Betting Line & Odds: ${lineTeam} ML`;
    if (prediction.projectionJson) {
      modelLine = `Model Pick: ${prediction.projectionJson.projectedWinner} (${prediction.projectionJson.winProbability}% win probability, Confidence: ${confidencePct}%)`;
      if (prediction.projectionJson.projectedWinner !== lineTeam) {
        warningLine = '⚠️ Model disagrees with the betting line!';
      }
    }
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
    predictionLine = `Betting Line & Odds: ${lineDirection} ${lineValue}`;
    if (prediction.projectionJson) {
      modelLine = `Model Pick: ${prediction.projectionJson.projectedHome}-${prediction.projectionJson.projectedAway} (Total: ${prediction.projectionJson.projectedTotal}, Confidence: ${confidencePct}%)`;
      if ((lineDirection === 'OVER' && prediction.projectionJson.projectedTotal < Number(lineValue)) ||
          (lineDirection === 'UNDER' && prediction.projectionJson.projectedTotal > Number(lineValue))) {
        warningLine = '⚠️ Model disagrees with the betting line!';
      }
    }
  }
  return [predictionLine, modelLine, warningLine].filter(Boolean).join('\n');
}

// Improved reasoning: show detailed stats and model warning
function buildReasoning(prediction: Prediction, game: Game, teamStatsMap: any): string {
  let homeStatsRaw = teamStatsMap[game.homeTeamName]?.statsJson;
  let awayStatsRaw = teamStatsMap[game.awayTeamName]?.statsJson;
  const homeStats = typeof homeStatsRaw === 'string' ? JSON.parse(homeStatsRaw) : homeStatsRaw;
  const awayStats = typeof awayStatsRaw === 'string' ? JSON.parse(awayStatsRaw) : awayStatsRaw;
  let points: string[] = [];
  if (homeStats && awayStats) {
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
      
      predictionsByGrade[grade].forEach(({ game, prediction }) => {
        const gameTime = format(new Date(game.gameDate), 'h:mm a');
        emailBody += `${game.awayTeamName} @ ${game.homeTeamName} (${gameTime})\n`;
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
  try {
    const emailService = new EmailService();
    await emailService.verifyConnection();

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
    const teamStatsMap = Object.fromEntries(teamStatsRecords.map(ts => [ts.teamName, ts]));

    // Flatten all predictions and enrich with stats and warnings
    let allPredictions: Array<{ game: Game; prediction: Prediction; confidence: number; reasoning: string } > = [];
    for (const game of games) {
      for (const prediction of game.predictions) {
        allPredictions.push({
          game,
          prediction,
          confidence: prediction.confidence,
          reasoning: buildReasoning(prediction, game, teamStatsMap)
        });
      }
    }

    // Sort all predictions by confidence descending
    allPredictions.sort((a, b) => b.confidence - a.confidence);

    // Format email body using grouping by grade
    let emailBody = formatPredictions(games, teamStatsMap);

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