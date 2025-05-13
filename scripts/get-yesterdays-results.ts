import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { format, subDays } from 'date-fns';
import nodemailer from 'nodemailer';
import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

// Configure email transporter with debug logging
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'jakobwiley@gmail.com',
    pass: 'viuu mewv awkx sdvy'
  },
  logger: true,
  debug: true // include SMTP traffic in the logs
});

// Verify SMTP connection configuration
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', error);
    return false;
  }
}

interface TypeAnalysis {
  type: PredictionType;
  totalBets: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
}

interface ResultsSummary {
  date: string;
  totalPredictions: number;
  byType: Record<PredictionType, TypeAnalysis>;
  lessonsLearned: string[];
}

interface ResultsReport {
  date: string;
  gamesProcessed: number;
  gamesWithScores: number;
  predictionsUpdated: number;
  errors: string[];
}

function calculateROI(prediction: any): number {
  switch (prediction.outcome) {
    case PredictionOutcome.WIN:
      return 1; // Won 1 unit
    case PredictionOutcome.LOSS:
      return -1; // Lost 1 unit
    default:
      return 0; // Push or pending
  }
}

function updateStreak(currentStreak: { count: number; type: 'WIN' | 'LOSS' | 'PUSH' }, 
                     outcome: PredictionOutcome): { count: number; type: 'WIN' | 'LOSS' | 'PUSH' } {
  if (outcome === PredictionOutcome.WIN && currentStreak.type === 'WIN') {
    return { count: currentStreak.count + 1, type: 'WIN' };
  } else if (outcome === PredictionOutcome.LOSS && currentStreak.type === 'LOSS') {
    return { count: currentStreak.count + 1, type: 'LOSS' };
  } else if (outcome === PredictionOutcome.WIN) {
    return { count: 1, type: 'WIN' };
  } else if (outcome === PredictionOutcome.LOSS) {
    return { count: 1, type: 'LOSS' };
  } else {
    return { count: 1, type: 'PUSH' };
  }
}

function generateLessonsLearned(summary: ResultsSummary): string[] {
  const lessons: string[] = [];

  // Find best and worst performing types by ROI
  const typesByROI = Object.values(summary.byType).reduce<{ best: TypeAnalysis | null; worst: TypeAnalysis | null }>(
    (acc, curr) => ({
      best: !acc.best || curr.roi > acc.best.roi ? curr : acc.best,
      worst: !acc.worst || curr.roi < acc.worst.roi ? curr : acc.worst
    }),
    { best: null, worst: null }
  );

  if (typesByROI.best) {
    lessons.push(`Best performing type was ${typesByROI.best.type} with ${(typesByROI.best.roi * 100).toFixed(1)}% ROI`);
  }
  if (typesByROI.worst) {
    lessons.push(`Worst performing type was ${typesByROI.worst.type} with ${(typesByROI.worst.roi * 100).toFixed(1)}% ROI`);
  }

  return lessons;
}

export async function getYesterdaysResults(): Promise<ResultsSummary> {
  const yesterday = subDays(new Date(), 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Get all predictions from yesterday with their games
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

  const summary: ResultsSummary = {
    date: format(yesterday, 'MMM d, yyyy'),
    totalPredictions: predictions.length,
    byType: {
      [PredictionType.SPREAD]: {
        type: PredictionType.SPREAD,
        totalBets: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        winRate: 0,
        roi: 0
      },
      [PredictionType.MONEYLINE]: {
        type: PredictionType.MONEYLINE,
        totalBets: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        winRate: 0,
        roi: 0
      },
      [PredictionType.TOTAL]: {
        type: PredictionType.TOTAL,
        totalBets: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        winRate: 0,
        roi: 0
      }
    },
    lessonsLearned: []
  };

  // Process each prediction
  predictions.forEach(pred => {
    const typeStats = summary.byType[pred.predictionType];
    
    switch (pred.outcome) {
      case PredictionOutcome.WIN:
        typeStats.wins++;
        break;
      case PredictionOutcome.LOSS:
        typeStats.losses++;
        break;
      case PredictionOutcome.PENDING:
        // Skip pending predictions
        break;
      default:
        typeStats.pushes++;
        break;
    }

    typeStats.totalBets++;
  });

  // Calculate win rates and ROI for each type
  Object.values(summary.byType).forEach(typeStats => {
    const completedBets = typeStats.wins + typeStats.losses;
    if (completedBets > 0) {
      typeStats.winRate = (typeStats.wins / completedBets) * 100;
      // Calculate ROI: (Net Profit / Total Investment) * 100
      const investment = completedBets; // 1 unit per bet
      const returns = typeStats.wins - typeStats.losses; // Net units won/lost
      typeStats.roi = (returns / investment) * 100;
    }
  });

  // Generate lessons learned
  summary.lessonsLearned = generateLessonsLearned(summary);

  return summary;
}

export function formatResultsSummary(summary: ResultsSummary): string {
  let output = '\nYESTERDAY\'S RESULTS SUMMARY\n';
  output += '========================\n\n';
  output += `Date: ${summary.date}\n`;
  output += `Total Predictions: ${summary.totalPredictions}\n\n`;

  output += 'Performance by Type:\n';
  Object.entries(summary.byType).forEach(([type, stats]) => {
    output += `${type}:\n`;
    output += `  Wins: ${stats.wins}\n`;
    output += `  Losses: ${stats.losses}\n`;
    output += `  Pushes: ${stats.pushes}\n`;
    output += `  Win Rate: ${stats.winRate.toFixed(1)}%\n`;
    output += `  ROI: ${(stats.roi * 100).toFixed(1)}%\n`;
  });

  if (summary.lessonsLearned.length > 0) {
    output += '\nKey Insights:\n';
    summary.lessonsLearned.forEach(lesson => {
      output += `- ${lesson}\n`;
    });
  }

  return output;
}

async function saveReport(report: ResultsReport): Promise<void> {
  const reportsDir = join(__dirname, '..', 'reports');
  await mkdir(reportsDir, { recursive: true });
  
  const filename = `results-${report.date}.json`;
  const filepath = join(reportsDir, filename);
  await writeFile(filepath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${filepath}`);
}

async function emailResults(summary: ResultsSummary): Promise<void> {
  const formattedSummary = formatResultsSummary(summary);
  
  try {
    // First verify the connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      throw new Error('Failed to verify SMTP connection');
    }

    // Send the email
    const info = await transporter.sendMail({
      from: '"Sports Betting Results" <jakobwiley@gmail.com>',
      to: 'jakobwiley@gmail.com',
      subject: `Sports Betting Results - ${summary.date}`,
      text: formattedSummary,
      headers: {
        'priority': 'high'
      }
    });

    console.log('Email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error; // Re-throw to be caught by the main error handler
  }
}

// Self-executing async function
(async () => {
  try {
    const summary = await getYesterdaysResults();
    console.log(formatResultsSummary(summary));
    // await emailResults(summary);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})(); 