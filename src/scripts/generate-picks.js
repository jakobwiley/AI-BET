import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile } from 'fs/promises';
import { format } from 'date-fns';
import { getConfidenceGrade } from '../lib/prediction.ts';
import { exec } from 'child_process';
import { promisify } from 'util';
import EmailService from '../lib/emailService.ts';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seenPicks = new Set();

function formatPrediction(prediction) {
  const grade = getConfidenceGrade(prediction.confidence);
  const confidencePercentage = Math.round(prediction.confidence);
  
  let betDescription = '';
  let uniqueKey = '';
  
  if (prediction.predictionType === 'SPREAD') {
    const direction = prediction.predictionValue > 0 ? '+' : '';
    betDescription = `${prediction.team} ${direction}${prediction.predictionValue}`;
    uniqueKey = `${prediction.gameId}-${prediction.team}-SPREAD-${prediction.predictionValue}`;
  } else if (prediction.predictionType === 'TOTAL') {
    const direction = prediction.predictionValue > 0 ? 'O' : 'U';
    betDescription = `${direction}${Math.abs(prediction.predictionValue)}`;
    uniqueKey = `${prediction.gameId}-TOTAL-${direction}${prediction.predictionValue}`;
  } else if (prediction.predictionType === 'MONEYLINE') {
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
    
    // Escape the body for terminal
    const escapedBody = body.replace(/"/g, '\\"').replace(/`/g, '\\`');
    
    // Create the email command
    const command = `echo "${escapedBody}" | mail -s "${subject}" ${to}`;
    
    // Execute the command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error sending email: ${error.message}`);
        console.error(`You might need to install mailx or configure your mail system.`);
        console.error(`On macOS, try: brew install mailutils`);
        console.error(`On Ubuntu/Debian, try: sudo apt-get install mailutils`);
        return;
      }
      
      if (stderr) {
        console.error(`Email command stderr: ${stderr}`);
        return;
      }
      
      console.log(`Email sent successfully to ${to}`);
    });
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
    
    // Lower confidence threshold to 0.6 (60%)
    const games = await prisma.game.findMany({
      where: {
        gameDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        sport: 'MLB',
        predictions: {
          some: {
            confidence: {
              gte: 0.6
            }
          }
        }
      },
      include: {
        predictions: {
          where: {
            confidence: {
              gte: 0.6
            }
          }
        }
      }
    });

    console.log(`Found ${games.length} games with predictions`);
    console.log('Game details:', games.map(g => ({
      id: g.id,
      teams: `${g.homeTeamName} vs ${g.awayTeamName}`,
      predictionCount: g.predictions.length
    })));

    const picksBySportAndGrade = {
      MLB: { 'A+': [], A: [], B: [], C: [] }
    };

    for (const game of games) {
      console.log(`\nProcessing game ${game.id}: ${game.homeTeamName} vs ${game.awayTeamName}`);
      console.log(`Game has ${game.predictions.length} predictions`);
      
      for (const prediction of game.predictions) {
        prediction.team = prediction.predictionValue > 0 ? game.awayTeamName : game.homeTeamName;
        console.log(`Processing prediction:`, {
          type: prediction.predictionType,
          value: prediction.predictionValue,
          confidence: prediction.confidence,
          team: prediction.team
        });
        
        const formattedPick = formatPrediction(prediction);
        if (formattedPick) {
          const grade = getConfidenceGrade(prediction.confidence);
          console.log(`Adding pick: ${formattedPick} (Grade ${grade})`);
          
          // Ensure the grade array exists
          if (!picksBySportAndGrade.MLB[grade]) {
            picksBySportAndGrade.MLB[grade] = [];
          }
          
          picksBySportAndGrade.MLB[grade].push({
            pick: formattedPick,
            confidence: prediction.confidence
          });
        } else {
          console.log('Pick was filtered out (duplicate)');
        }
      }
    }

    // Sort picks by confidence within each grade
    for (const sport in picksBySportAndGrade) {
      console.log(`\nProcessing ${sport} picks:`);
      for (const grade in picksBySportAndGrade[sport]) {
        const picks = picksBySportAndGrade[sport][grade];
        console.log(`Grade ${grade}: ${picks.length} picks before sorting`);
        
        picks.sort((a, b) => b.confidence - a.confidence);
        picksBySportAndGrade[sport][grade] = picks.map(p => p.pick);
        
        console.log(`Grade ${grade} picks after sorting:`, picksBySportAndGrade[sport][grade]);
      }
    }

    let output = '';
    const date = format(today, 'M/d/yyyy');
    
    console.log('\nGenerating final output...');
    for (const sport in picksBySportAndGrade) {
      if (Object.values(picksBySportAndGrade[sport]).some(picks => picks.length > 0)) {
        output += `\nDaily ${sport} Picks - ${date}\n`;
        output += '='.repeat(40) + '\n\n';
        
        for (const grade in picksBySportAndGrade[sport]) {
          const picks = picksBySportAndGrade[sport][grade];
          if (picks.length > 0) {
            output += `Grade ${grade} Picks:\n`;
            output += '-'.repeat(20) + '\n';
            
            for (const pick of picks) {
              output += `${pick}\n`;
            }
            output += '\n';
          }
        }
      }
    }

    if (!output.trim()) {
      output = `No picks available for ${date}. This could be due to:\n`;
      output += `- No games scheduled\n`;
      output += `- No predictions meeting the confidence threshold\n`;
      output += `- All predictions being filtered as duplicates\n`;
      console.log('No picks were generated');
    } else {
      console.log('Generated picks:', output);
    }

    // Save picks to file
    const picksPath = join(process.cwd(), 'todays-picks.txt');
    await writeFile(picksPath, output);
    console.log(`Picks saved to ${picksPath}`);

    // Send email if recipient is set
    const emailRecipient = process.env.RECIPIENT_EMAIL;
    if (emailRecipient) {
      const subject = `Daily MLB Picks - ${format(today, 'M/d/yyyy')}`;
      await sendEmail(emailRecipient, subject, output);
    }

    console.log('Pick generation process completed');
  } catch (error) {
    console.error('Error generating picks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generatePicks().catch(console.error);