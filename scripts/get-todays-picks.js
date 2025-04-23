import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

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

function formatOdds(odds, predictionType, predictionValue, homeTeamName, awayTeamName) {
  try {
    const oddsData = typeof odds === 'string' ? JSON.parse(odds) : odds;
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
          const isOver = predictionValue > 0;
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
  } catch (e) {
    console.error('Error formatting odds:', e);
  }
  
  // Fallback format if odds parsing fails
  switch (predictionType) {
    case 'SPREAD':
      return `${predictionValue > 0 ? homeTeamName : awayTeamName} ${predictionValue}`;
    case 'TOTAL':
      return `${predictionValue > 0 ? 'Over' : 'Under'} ${Math.abs(predictionValue)}`;
    case 'MONEYLINE':
      return `${predictionValue > 0 ? homeTeamName : awayTeamName} ML`;
  }
}

async function sendEmail(content) {
  try {
    const today = new Date().toLocaleDateString();
    
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
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get games with predictions
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: tomorrow
        },
        predictions: {
          some: {}
        }
      },
      include: {
        predictions: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });

    let output = `Daily Picks for ${today.toLocaleDateString()}\n\n`;
    
    // Process MLB games
    const mlbGames = games.filter(g => g.sport === 'MLB');
    if (mlbGames.length > 0) {
      output += 'MLB PICKS\n';
      output += '=========\n\n';
      
      // Group predictions by grade
      const predictionsByGrade = {};
      
      for (const game of mlbGames) {
        for (const pred of game.predictions) {
          const grade = calculateGrade(pred.confidence);
          if (!predictionsByGrade[grade]) {
            predictionsByGrade[grade] = [];
          }
          
          const gameTime = new Date(game.gameDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          const matchup = `${game.awayTeamName} @ ${game.homeTeamName} (${gameTime})`;
          const pick = formatOdds(game.oddsJson, pred.predictionType, pred.predictionValue, game.homeTeamName, game.awayTeamName);
          const confidence = Math.round(pred.confidence * 100);
          
          predictionsByGrade[grade].push({
            matchup,
            pick,
            confidence,
            reasoning: pred.reasoning
          });
        }
      }
      
      // Output predictions sorted by grade
      ['A+', 'A', 'A-', 'B+', 'B'].forEach(grade => {
        const predictions = predictionsByGrade[grade];
        if (predictions && predictions.length > 0) {
          output += `${grade} Grade Predictions:\n`;
          output += '-'.repeat(20) + '\n\n';
          
          predictions.sort((a, b) => b.confidence - a.confidence);
          predictions.forEach(p => {
            output += `${p.matchup}\n`;
            output += `${p.pick}\n`;
            output += `Confidence: ${p.confidence}% (${grade})\n`;
            if (p.reasoning) {
              output += `Reasoning: ${p.reasoning}\n`;
            }
            output += '\n';
          });
        }
      });
    }
    
    // Process NBA games (similar structure)
    const nbaGames = games.filter(g => g.sport === 'NBA');
    if (nbaGames.length > 0) {
      output += '\nNBA PICKS\n';
      output += '=========\n\n';
      // Similar processing for NBA games...
    }

    // Save to file
    const filePath = path.join(__dirname, '../todays-picks.txt');
    fs.writeFileSync(filePath, output);
    console.log(`Picks saved to ${filePath}`);

    // Send email
    await sendEmail(output);
    console.log('Email sent with today\'s picks');

  } catch (error) {
    console.error('Error getting picks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTodaysPicks(); 