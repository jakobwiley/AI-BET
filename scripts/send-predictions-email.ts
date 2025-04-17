import { PrismaClient, GameStatus } from '@prisma/client';
import { format } from 'date-fns';
import EmailService from '../src/lib/emailService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface Prediction {
  gameId: string;
  predictionType: string;
  predictionValue: number;
  confidence: number;
  reasoning: string;
  grade?: string;
}

interface Game {
  id: string;
  sport: string;
  homeTeamName: string;
  awayTeamName: string;
  gameDate: Date;
  status: GameStatus;
  predictions: Prediction[];
}

async function formatPredictions(games: Game[]): Promise<string> {
  let output = `AI-BET Predictions for ${format(new Date(), 'MMMM d, yyyy')}\n`;
  output += '='.repeat(50) + '\n\n';

  // Group predictions by sport
  const predictionsBySport: Record<string, Game[]> = {};
  games.forEach(game => {
    if (!predictionsBySport[game.sport]) {
      predictionsBySport[game.sport] = [];
    }
    predictionsBySport[game.sport].push(game);
  });

  // Format predictions for each sport
  for (const [sport, sportGames] of Object.entries(predictionsBySport)) {
    output += `${sport} Predictions\n`;
    output += '-'.repeat(30) + '\n\n';

    sportGames.forEach(game => {
      output += `${game.awayTeamName} @ ${game.homeTeamName}\n`;
      output += `Date: ${format(new Date(game.gameDate), 'MMM d, h:mm a')}\n\n`;

      // Group predictions by type
      const predictionsByType: Record<string, Prediction[]> = {};
      game.predictions.forEach(prediction => {
        if (!predictionsByType[prediction.predictionType]) {
          predictionsByType[prediction.predictionType] = [];
        }
        predictionsByType[prediction.predictionType].push(prediction);
      });

      // Format each prediction type
      for (const [type, predictions] of Object.entries(predictionsByType)) {
        predictions.forEach(prediction => {
          output += `${type}:\n`;
          output += `  Confidence: ${prediction.confidence}%${prediction.grade ? ` (${prediction.grade})` : ''}\n`;
          if (prediction.predictionValue !== 0) {
            output += `  Value: ${prediction.predictionValue}\n`;
          }
          output += `  Reasoning: ${prediction.reasoning}\n\n`;
        });
      }
      output += '-'.repeat(30) + '\n\n';
    });
  }

  return output;
}

async function main() {
  try {
    // Initialize email service
    const emailService = new EmailService();
    
    // Verify email connection
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      console.error('Failed to connect to email service');
      return;
    }

    // Get today's games with predictions
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        },
        status: GameStatus.SCHEDULED,
        predictions: {
          some: {}
        }
      },
      include: {
        predictions: true
      }
    });

    if (games.length === 0) {
      console.log('No games with predictions found for today');
      return;
    }

    // Format predictions
    const emailBody = await formatPredictions(games);

    // Send email
    await emailService.sendEmail({
      to: process.env.RECIPIENT_EMAIL || 'jakobwiley@gmail.com',
      subject: `AI-BET Predictions for ${format(new Date(), 'MMM d, yyyy')}`,
      body: emailBody
    });

    console.log('Predictions email sent successfully');
  } catch (error) {
    console.error('Error sending predictions email:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 