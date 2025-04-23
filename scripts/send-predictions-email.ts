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
  predictionValue: number;
  confidence: number;
  reasoning: string;
  outcome: 'PENDING' | 'WIN' | 'LOSS';
  createdAt: Date;
  updatedAt: Date;
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
  let predictionText = '';
  
  switch (prediction.predictionType) {
    case 'SPREAD':
      const spreadValue = Math.abs(prediction.predictionValue);
      const spreadDirection = prediction.predictionValue > 0 ? 'favorite' : 'underdog';
      const spreadTeam = prediction.predictionValue > 0 ? game.homeTeamName : game.awayTeamName;
      predictionText = `${spreadTeam} ${spreadDirection} ${spreadValue}`;
      break;
      
    case 'TOTAL':
      const totalValue = Math.abs(prediction.predictionValue);
      const totalDirection = prediction.predictionValue > totalValue ? 'OVER' : 'UNDER';
      predictionText = `${totalDirection} ${totalValue}`;
      break;
      
    case 'MONEYLINE':
      const mlTeam = prediction.predictionValue > 0 ? game.homeTeamName : game.awayTeamName;
      predictionText = `${mlTeam} ML`;
      break;
  }
  
  return `${prediction.predictionType}: ${predictionText} (${Math.round(prediction.confidence * 100)}% confidence)`;
}

function formatPredictions(games: Game[]): string {
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
        
        // Format reasoning with bullet points
        const reasoningPoints = prediction.reasoning.split('\n').filter(point => point.trim());
        reasoningPoints.forEach(point => {
          emailBody += `• ${point.trim()}\n`;
        });
        
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

    const emailBody = formatPredictions(games);
    
    // Display predictions in console
    console.log('\n=== TODAY\'S PREDICTIONS ===\n');
    console.log(emailBody);
    console.log('\n===========================\n');
    
    // Ask for confirmation before sending email
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await rl.question('Would you like to send these predictions via email? (y/n): ');
    rl.close();

    if (answer.toLowerCase() === 'y') {
      await emailService.sendEmail({
        to: process.env.EMAIL_TO || '',
        subject: `Sports Betting Predictions - ${format(new Date(), 'MMMM d, yyyy')}`,
        body: emailBody
      });
      console.log('Predictions email sent successfully');
    } else {
      console.log('Email sending cancelled');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();