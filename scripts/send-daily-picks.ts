import { PrismaClient, PredictionType, SportType } from '@prisma/client';
import { format, addDays } from 'date-fns';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'jakobwiley@gmail.com',
    pass: 'viuu mewv awkx sdvy'
  },
  logger: true,
  debug: true
});

async function getTomorrowsPicks() {
  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = addDays(tomorrow, 1);

  const predictions = await prisma.prediction.findMany({
    where: {
      game: {
        gameDate: {
          gte: tomorrow,
          lt: dayAfter
        }
      }
    },
    include: {
      game: true
    },
    orderBy: [
      { confidence: 'desc' },
      { predictionType: 'asc' }
    ]
  });

  return predictions;
}

function formatPrediction(pred: any) {
  const gameTime = new Date(pred.game.gameDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  });

  let value = pred.predictionValue;
  if (pred.predictionType === PredictionType.SPREAD) {
    value = `${value} points`;
  } else if (pred.predictionType === PredictionType.TOTAL) {
    value = value.startsWith('o') ? `Over ${value.slice(1)}` : `Under ${value.slice(1)}`;
  } else {
    value = 'ML';
  }

  return `${pred.game.homeTeamName} vs ${pred.game.awayTeamName} (${gameTime})
${pred.predictionType === PredictionType.MONEYLINE ? pred.game.homeTeamName : value}
Confidence: ${(pred.confidence * 100).toFixed(0)}%
Reasoning: ${pred.reasoning}\n`;
}

function formatEmailBody(predictions: any[]) {
  const date = format(new Date(), 'MMM d, yyyy');
  let body = `Daily Picks for ${date}\n\n`;

  // Group by sport type
  const sportGroups = predictions.reduce((acc, pred) => {
    const sport = pred.game.sport;
    if (!acc[sport]) acc[sport] = [];
    acc[sport].push(pred);
    return acc;
  }, {});

  // Format each sport section
  Object.entries(sportGroups).forEach(([sport, preds]: [string, any[]]) => {
    body += `${sport} PICKS\n`;
    body += '=========\n\n';

    // Group by grade (A, A-, B+)
    const gradeRanges = [
      { min: 85, grade: 'A' },
      { min: 80, grade: 'A-' },
      { min: 75, grade: 'B+' }
    ];

    gradeRanges.forEach(({ min, grade }) => {
      const gradePreds = preds.filter(p => p.confidence * 100 >= min && p.confidence * 100 < min + 5);
      if (gradePreds.length > 0) {
        body += `${grade} Grade Predictions:\n`;
        body += '--------------------\n\n';
        gradePreds.forEach(pred => {
          body += formatPrediction(pred);
          body += '\n';
        });
      }
    });
  });

  return body;
}

async function sendDailyPicks() {
  try {
    const predictions = await getTomorrowsPicks();
    if (predictions.length === 0) {
      console.log('No predictions found for tomorrow');
      return;
    }

    const emailBody = formatEmailBody(predictions);
    const info = await transporter.sendMail({
      from: '"Sports Betting Predictions" <jakobwiley@gmail.com>',
      to: 'jakemullins@gmail.com',
      subject: `Sports Betting Predictions - ${format(addDays(new Date(), 1), 'M/d/yyyy')}`,
      text: emailBody,
      headers: {
        'priority': 'high'
      }
    });

    console.log('Daily picks email sent successfully');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('Failed to send daily picks:', error);
    throw error;
  }
}

// Run if called directly
(async () => {
  try {
    await sendDailyPicks();
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})(); 