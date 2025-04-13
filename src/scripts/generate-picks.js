import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile } from 'fs/promises';
import { format } from 'date-fns';
import { getConfidenceGrade } from '../lib/prediction.ts';
import sgMail from '@sendgrid/mail';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const seenPicks = new Set();

function formatPrediction(prediction) {
  const grade = getConfidenceGrade(prediction.confidence);
  const confidencePercentage = Math.round(prediction.confidence * 100);
  
  let betDescription = '';
  let uniqueKey = '';
  
  if (prediction.type === 'SPREAD') {
    const direction = prediction.prediction > 0 ? '+' : '';
    betDescription = `${prediction.team} ${direction}${prediction.prediction}`;
    uniqueKey = `${prediction.gameId}-${prediction.team}-SPREAD-${prediction.prediction}`;
  } else if (prediction.type === 'TOTAL') {
    const direction = prediction.prediction === 'OVER' ? 'O' : 'U';
    betDescription = `${direction}${prediction.total}`;
    uniqueKey = `${prediction.gameId}-TOTAL-${direction}${prediction.total}`;
  } else if (prediction.type === 'MONEYLINE') {
    betDescription = `${prediction.team} ML`;
    uniqueKey = `${prediction.gameId}-${prediction.team}-ML`;
  }

  if (seenPicks.has(uniqueKey)) {
    return null;
  }
  seenPicks.add(uniqueKey);

  return `${betDescription} (${grade} - ${confidencePercentage}%)`;
}

async function sendEmail(to, subject, body) {
  try {
    console.log(`Sending email to ${to} with subject: ${subject}`);
    
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'picks@ai-bet.com',
      subject,
      text: body,
    };

    await sgMail.send(msg);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function generatePicks() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`Fetching games for date: ${today.toISOString().split('T')[0]}`);
    
    const games = await prisma.game.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        predictions: {
          some: {
            confidence: {
              gte: 0.75
            }
          }
        }
      },
      include: {
        predictions: {
          where: {
            confidence: {
              gte: 0.75
            }
          }
        }
      }
    });

    console.log(`Found ${games.length} games`);

    const picksBySportAndGrade = {
      MLB: { A: [], B: [], C: [] },
      NBA: { A: [], B: [], C: [] }
    };

    for (const game of games) {
      for (const prediction of game.predictions) {
        const formattedPick = formatPrediction(prediction);
        if (formattedPick) {
          const grade = getConfidenceGrade(prediction.confidence);
          picksBySportAndGrade[game.sport][grade].push({
            pick: formattedPick,
            confidence: prediction.confidence
          });
        }
      }
    }

    // Sort picks by confidence within each grade
    for (const sport in picksBySportAndGrade) {
      for (const grade in picksBySportAndGrade[sport]) {
        picksBySportAndGrade[sport][grade].sort((a, b) => b.confidence - a.confidence);
        picksBySportAndGrade[sport][grade] = picksBySportAndGrade[sport][grade].map(p => p.pick);
      }
    }

    let output = '';
    const date = today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    
    for (const sport in picksBySportAndGrade) {
      if (Object.values(picksBySportAndGrade[sport]).some(picks => picks.length > 0)) {
        output += `\n${sport} Picks for ${date}\n`;
        output += '='.repeat(40) + '\n\n';
        
        for (const grade in picksBySportAndGrade[sport]) {
          const picks = picksBySportAndGrade[sport][grade];
          if (picks.length > 0) {
            output += `Grade ${grade} Picks:\n`;
            output += '-'.repeat(20) + '\n';
            
            for (const pick of picks) {
              output += `${pick}\n`;
            }
          }
        }
      }
    }

    // Save picks to file
    const picksPath = join(process.cwd(), 'todays-picks.txt');
    await writeFile(picksPath, output);
    console.log(`Picks saved to ${picksPath}`);

    // Send email if recipient is set
    const emailRecipients = process.env.EMAIL_RECIPIENTS;
    if (emailRecipients) {
      const subject = `Daily Sports Picks - ${format(today, 'M/d/yyyy')}`;
      await sendEmail(emailRecipients, subject, output);
    }

    console.log('All picks generated successfully');
  } catch (error) {
    console.error('Error generating picks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generatePicks().catch(console.error);