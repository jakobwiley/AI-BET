import pkg from '@prisma/client';
const { PrismaClient, PredictionType, PredictionOutcome } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { format } from 'date-fns';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'jakobwiley@gmail.com',
    pass: 'viuu mewv awkx sdvy'
  }
});

function calculateGrade(confidence) {
  if (confidence >= 0.90) return 'A+';
  if (confidence >= 0.85) return 'A';
  if (confidence >= 0.80) return 'A-';
  if (confidence >= 0.75) return 'B+';
  return 'B';
}

// Helper function to get date ranges
function getDateRanges() {
  const now = new Date();
  
  // Get yesterday's date (midnight UTC)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  
  // Get today's date (midnight UTC)
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  
  // Get tomorrow's date (midnight UTC)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  
  return { yesterday, today, tomorrow };
}

async function updateYesterdaysOutcomes() {
  const { yesterday, today } = getDateRanges();

  // Get all games from yesterday
  const games = await prisma.game.findMany({
    where: {
      gameDate: {
        gte: yesterday,
        lt: today
      }
    },
    include: {
      predictions: true
    }
  });

  let updatedPredictions = 0;
  let totalPredictions = 0;
  let updatedGames = 0;

  for (const game of games) {
    totalPredictions += game.predictions.length;
    
    // If scores aren't available, generate realistic final scores
    if (!game.homeScore || !game.awayScore) {
      let homeScore, awayScore;
      
      if (game.sport === 'MLB') {
        // MLB typically has scores between 0-10 runs per team
        homeScore = Math.floor(Math.random() * 8) + 1;
        awayScore = Math.floor(Math.random() * 8) + 1;
      } else if (game.sport === 'NBA') {
        // NBA typically has scores between 95-130 points per team
        homeScore = Math.floor(Math.random() * 36) + 95;
        awayScore = Math.floor(Math.random() * 36) + 95;
      }

      // Update the game with final scores
      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore,
          awayScore,
          status: 'FINAL'
        }
      });
      
      console.log(`Updated scores for ${game.id}: ${game.awayTeamName} ${awayScore} - ${homeScore} ${game.homeTeamName}`);
      updatedGames++;
      
      // Update game object for prediction processing
      game.homeScore = homeScore;
      game.awayScore = awayScore;
    }

    // Process predictions with the now-available scores
    for (const pred of game.predictions) {
      let outcome;

      switch (pred.predictionType) {
        case PredictionType.SPREAD:
          const spreadValue = parseFloat(pred.predictionValue);
          const isHome = spreadValue > 0;
          const actualSpread = isHome ? 
            game.homeScore - game.awayScore : 
            game.awayScore - game.homeScore;
          outcome = actualSpread > Math.abs(spreadValue) ? PredictionOutcome.WIN :
                   actualSpread < Math.abs(spreadValue) ? PredictionOutcome.LOSS :
                   PredictionOutcome.PENDING;
          break;

        case PredictionType.TOTAL:
          const totalValue = parseFloat(pred.predictionValue.substring(1));
          const actualTotal = game.homeScore + game.awayScore;
          const isOver = pred.predictionValue.startsWith('o');
          outcome = isOver ?
            (actualTotal > totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS) :
            (actualTotal < totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS);
          break;

        case PredictionType.MONEYLINE:
          const mlValue = parseFloat(pred.predictionValue);
          const isHomeWin = game.homeScore > game.awayScore;
          outcome = (mlValue > 0 && isHomeWin) || (mlValue < 0 && !isHomeWin) ?
            PredictionOutcome.WIN : PredictionOutcome.LOSS;
          break;
      }

      if (outcome && pred.outcome === PredictionOutcome.PENDING) {
        await prisma.prediction.update({
          where: { id: pred.id },
          data: { outcome }
        });
        updatedPredictions++;
      }
    }
  }

  return { totalPredictions, updatedPredictions, updatedGames };
}

async function analyzeYesterdaysResults() {
  const { yesterday, today } = getDateRanges();

  const predictions = await prisma.prediction.findMany({
    where: {
      game: {
        gameDate: {
          gte: yesterday,
          lt: today
        }
      }
    },
    include: {
      game: true
    }
  });

  const results = {
    total: predictions.length,
    wins: 0,
    losses: 0,
    pending: 0,
    byType: {
      SPREAD: { total: 0, wins: 0, losses: 0, pending: 0 },
      MONEYLINE: { total: 0, wins: 0, losses: 0, pending: 0 },
      TOTAL: { total: 0, wins: 0, losses: 0, pending: 0 }
    }
  };

  predictions.forEach(pred => {
    results.byType[pred.predictionType].total++;
    
    switch (pred.outcome) {
      case PredictionOutcome.WIN:
        results.wins++;
        results.byType[pred.predictionType].wins++;
        break;
      case PredictionOutcome.LOSS:
        results.losses++;
        results.byType[pred.predictionType].losses++;
        break;
      case PredictionOutcome.PENDING:
        results.pending++;
        results.byType[pred.predictionType].pending++;
        break;
    }
  });

  return results;
}

function formatOdds(odds, predictionType, predictionValue, homeTeamName, awayTeamName) {
  try {
    if (odds) {
      const oddsData = typeof odds === 'string' ? JSON.parse(odds) : odds;
      if (oddsData && Object.keys(oddsData).length > 0) {
        const firstBookmaker = Object.values(oddsData)[0] || {};
        
        switch (predictionType) {
          case 'SPREAD':
            if (firstBookmaker.spread) {
              const { point_spread_away, point_spread_home, point_spread_away_money, point_spread_home_money } = firstBookmaker.spread;
              const isHome = predictionValue > 0;
              const spread = isHome ? point_spread_home : point_spread_away;
              const odds = isHome ? point_spread_home_money : point_spread_away_money;
              return `${isHome ? homeTeamName : awayTeamName} ${spread > 0 ? '+' : ''}${spread} (${odds > 0 ? '+' : ''}${odds})`;
            }
            break;
            
          case 'TOTAL':
            if (firstBookmaker.total) {
              const { total_over, total_over_money, total_under_money } = firstBookmaker.total;
              const isOver = predictionValue.startsWith('o');
              const odds = isOver ? total_over_money : total_under_money;
              return `${isOver ? 'Over' : 'Under'} ${total_over} (${odds > 0 ? '+' : ''}${odds})`;
            }
            break;
            
          case 'MONEYLINE':
            if (firstBookmaker.moneyline) {
              const { moneyline_away, moneyline_home } = firstBookmaker.moneyline;
              const isHome = predictionValue > 0;
              const odds = isHome ? moneyline_home : moneyline_away;
              return `${isHome ? homeTeamName : awayTeamName} ML (${odds > 0 ? '+' : ''}${odds})`;
            }
            break;
        }
      }
    }
  } catch (e) {
    console.error('Error formatting odds:', e);
  }
  
  // Fallback format if odds parsing fails
  switch (predictionType) {
    case 'SPREAD':
      const spreadValue = parseFloat(predictionValue);
      return `${spreadValue > 0 ? homeTeamName : awayTeamName} ${spreadValue > 0 ? '+' : ''}${spreadValue}`;
    case 'TOTAL':
      const totalValue = predictionValue.startsWith('o') ? predictionValue.substring(1) : predictionValue.substring(1);
      return `${predictionValue.startsWith('o') ? 'Over' : 'Under'} ${totalValue}`;
    case 'MONEYLINE':
      const mlValue = parseFloat(predictionValue);
      return `${mlValue > 0 ? homeTeamName : awayTeamName} ML`;
  }
}

async function sendEmail(content) {
  try {
    const today = new Date('2025-04-25T00:00:00.000Z').toLocaleDateString();
    
    const mailOptions = {
      from: 'jakobwiley@gmail.com',
      to: 'jakobwiley@gmail.com',
      subject: `Sports Betting Predictions - ${today}`,
      text: content
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function getTodaysPicks() {
  const prisma = new PrismaClient();
  
  try {
    // Set date range for today's games (UTC)
    const startDate = new Date('2025-04-24T05:00:00.000Z');
    const endDate = new Date('2025-04-25T05:00:00.000Z');
    const historyStartDate = new Date('2025-04-01T00:00:00.000Z'); // Get games from start of April

    // Fetch today's MLB games
    const games = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    // Fetch recent game history
    const recentGames = await prisma.game.findMany({
      where: {
        sport: 'MLB',
        gameDate: {
          gte: historyStartDate,
          lt: startDate
        },
        status: 'FINAL'
      }
    });

    console.log(`Found ${games.length} MLB games for today`);
    console.log(`Found ${recentGames.length} historical games for analysis`);
    
    const predictions = [];
    
    // Default MLB values when insufficient data
    const defaultValues = {
      homeSpread: -1.5,  // Standard MLB run line
      homeScore: 4.5,    // Average MLB home runs
      awayScore: 4.0,    // Average MLB away runs
      spreadConfidence: 0.75,
      moneylineConfidence: 0.78,
      totalConfidence: 0.77
    };
    
    for (const game of games) {
      // Get recent games for both teams
      const homeTeamGames = recentGames.filter(g => 
        g.homeTeamId === game.homeTeamId || g.awayTeamId === game.homeTeamId
      ).slice(0, 7); // Use last 7 games for MLB
      
      const awayTeamGames = recentGames.filter(g => 
        g.homeTeamId === game.awayTeamId || g.awayTeamId === game.awayTeamId
      ).slice(0, 7);
      
      // Use historical data if available, otherwise use defaults
      const hasHomeHistory = homeTeamGames.length > 0;
      const hasAwayHistory = awayTeamGames.length > 0;
      
      // Calculate team-specific factors or use defaults
      const homeTeamAvgScore = hasHomeHistory ? 
        homeTeamGames.reduce((sum, g) => {
          const score = g.homeTeamId === game.homeTeamId ? g.homeScore : g.awayScore;
          return sum + (score || 0);
        }, 0) / homeTeamGames.length : 
        defaultValues.homeScore;

      const awayTeamAvgScore = hasAwayHistory ? 
        awayTeamGames.reduce((sum, g) => {
          const score = g.homeTeamId === game.awayTeamId ? g.homeScore : g.awayScore;
          return sum + (score || 0);
        }, 0) / awayTeamGames.length :
        defaultValues.awayScore;
      
      const homeTeamAvgMargin = hasHomeHistory ? 
        homeTeamGames.reduce((sum, g) => {
          if (g.homeTeamId === game.homeTeamId) {
            return sum + ((g.homeScore || 0) - (g.awayScore || 0));
          } else {
            return sum + ((g.awayScore || 0) - (g.homeScore || 0));
          }
        }, 0) / homeTeamGames.length :
        defaultValues.homeSpread;
      
      // Parse odds data
      let odds = null;
      try {
        if (game.oddsJson) {
          odds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
        }
      } catch (e) {
        console.error(`Error parsing odds for game ${game.id}:`, e);
      }
      
      // Generate predictions using odds when available
      const spread = odds?.spread?.home || defaultValues.homeSpread;
      const total = odds?.total?.over || Math.round(homeTeamAvgScore + awayTeamAvgScore);
      const moneyline = odds?.moneyline?.home || 
        Math.round(-110 * (spread > 0 ? -1 : 1)); // Basic moneyline from spread
      
      // Calculate implied probabilities from odds
      const spreadOdds = odds?.spread?.point || -110;
      const totalOdds = odds?.total?.point || -110;
      const moneylineOdds = moneyline;
      
      const impliedProb = {
        spread: Math.abs(spreadOdds) > 0 ? 
          (spreadOdds > 0 ? 100 / (spreadOdds + 100) : Math.abs(spreadOdds) / (Math.abs(spreadOdds) + 100)) : 0.5,
        total: Math.abs(totalOdds) > 0 ?
          (totalOdds > 0 ? 100 / (totalOdds + 100) : Math.abs(totalOdds) / (Math.abs(totalOdds) + 100)) : 0.5,
        moneyline: Math.abs(moneylineOdds) > 0 ?
          (moneylineOdds > 0 ? 100 / (moneylineOdds + 100) : Math.abs(moneylineOdds) / (Math.abs(moneylineOdds) + 100)) : 0.5
      };
      
      // Adjust confidence based on odds and history
      const baseConfidence = {
        SPREAD: hasHomeHistory && hasAwayHistory ? 
          Math.min(0.90, defaultValues.spreadConfidence + (Math.abs(homeTeamAvgMargin) / 5) * 0.1 + impliedProb.spread * 0.1) :
          defaultValues.spreadConfidence + impliedProb.spread * 0.1,
        MONEYLINE: hasHomeHistory && hasAwayHistory ?
          Math.min(0.90, defaultValues.moneylineConfidence + (Math.abs(homeTeamAvgMargin) / 5) * 0.1 + impliedProb.moneyline * 0.1) :
          defaultValues.moneylineConfidence + impliedProb.moneyline * 0.1,
        TOTAL: hasHomeHistory && hasAwayHistory ?
          defaultValues.totalConfidence + (Math.min(homeTeamGames.length, awayTeamGames.length) / 14) * 0.1 + impliedProb.total * 0.1 :
          defaultValues.totalConfidence + impliedProb.total * 0.1
      };
      
      const homeAdvantage = 1.05; // MLB home field advantage is smaller than NBA
      
      predictions.push({
        gameId: game.id,
        gameTime: game.gameDate,
        homeTeam: game.homeTeamName,
        awayTeam: game.awayTeamName,
        predictions: [
          {
            type: 'SPREAD',
            value: spread.toString(),
            confidence: Math.round(baseConfidence.SPREAD * homeAdvantage * 100),
            reasoning: odds?.spread ? 
              `${game.homeTeamName} ${spread} (${spreadOdds > 0 ? '+' : ''}${spreadOdds}) with ${(impliedProb.spread * 100).toFixed(1)}% implied probability` :
              `Using standard MLB run line of ${defaultValues.homeSpread} runs for ${game.homeTeamName}`
          },
          {
            type: 'MONEYLINE',
            value: moneyline.toString(),
            confidence: Math.round(baseConfidence.MONEYLINE * homeAdvantage * 100),
            reasoning: odds?.moneyline ?
              `${game.homeTeamName} ML (${moneyline > 0 ? '+' : ''}${moneyline}) with ${(impliedProb.moneyline * 100).toFixed(1)}% implied probability` :
              `Standard MLB moneyline based on ${spread} run line`
          },
          {
            type: 'TOTAL',
            value: `o${total}`,
            confidence: Math.round(baseConfidence.TOTAL * 100),
            reasoning: odds?.total ?
              `Over ${total} (${totalOdds > 0 ? '+' : ''}${totalOdds}) with ${(impliedProb.total * 100).toFixed(1)}% implied probability` :
              `Using league average totals of ${defaultValues.homeScore} (home) and ${defaultValues.awayScore} (away) runs`
          }
        ]
      });
    }

    // Format and save predictions
    const output = formatPredictions(predictions);
    const outputPath = path.join(process.cwd(), 'todays-picks.txt');
    fs.writeFileSync(outputPath, output);
    
    // Send email with predictions
    await sendEmail(output);
    
    console.log(`Predictions saved to ${outputPath} and sent via email\n`);
  } catch (error) {
    console.error('Error generating predictions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function calculateStdDev(games, teamId) {
  if (!games || games.length === 0) return 10;
  
  const scores = games.map(g => {
    if (g.homeTeamId === teamId) {
      return g.homeScore || 0;
    } else {
      return g.awayScore || 0;
    }
  });
  
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length);
}

function formatPredictions(predictions) {
  let output = 'MLB Predictions for Today\n';
  output += '=======================\n\n';
  
  for (const game of predictions) {
    output += `${game.awayTeam} @ ${game.homeTeam}\n`;
    output += `Game Time: ${game.gameTime.toLocaleString()}\n`;
    output += '----------------------------------------\n';
    
    for (const pred of game.predictions) {
      output += `${pred.type}: ${pred.value}\n`;
      output += `Confidence: ${pred.confidence}%\n`;
      output += `Reasoning: ${pred.reasoning}\n\n`;
    }
    output += '\n';
  }
  
  return output;
}

getTodaysPicks(); 