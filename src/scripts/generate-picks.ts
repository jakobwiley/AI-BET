import { fileURLToPath } from 'url';
import * as path from 'path';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
type Game = pkg.Game;
type Prediction = pkg.Prediction;
type PredictionType = pkg.PredictionType;
type PredictionOutcome = pkg.PredictionOutcome;

import { getConfidenceGrade, Grade, grades } from '../lib/prediction.js';
import { sendWhatsAppMessage, formatWhatsAppNumber } from '../lib/whatsapp.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface FormattedPick {
  pick: string;
  confidence: number;
}

type SportType = 'MLB' | 'NBA';

interface PicksBySportAndGrade {
  MLB: Record<Grade, FormattedPick[]>;
  NBA: Record<Grade, FormattedPick[]>;
}

type GameWithPredictions = Game & {
  predictions: Prediction[];
};

interface PredictionWithGrade extends Prediction {
  grade: Grade;
}

interface GameOdds {
  spread?: {
    homeOdds: number;
    awayOdds: number;
  };
  total?: {
    overUnder: number;
    overOdds: number;
    underOdds: number;
  };
  moneyline?: {
    homeOdds: number;
    awayOdds: number;
  };
}

interface GameWithOdds extends GameWithPredictions {
  odds?: GameOdds;
}

const initializePicksBySportAndGrade = (): PicksBySportAndGrade => {
  const emptyGradeRecord = grades.reduce((acc, grade) => {
    acc[grade] = [];
    return acc;
  }, {} as Record<Grade, FormattedPick[]>);

  return {
    MLB: { ...emptyGradeRecord },
    NBA: { ...emptyGradeRecord }
  };
};

const formatPrediction = (prediction: PredictionWithGrade, game: GameWithOdds, matchup: string): string => {
  const grade = prediction.grade;
  const confidencePercentage = Math.round(prediction.confidence * 100);
  let betDescription = '';
  let odds = '';

  const predictionValue = parseFloat(prediction.predictionValue);

  if (prediction.predictionType === 'SPREAD' && game.odds?.spread) {
    const spreadOdds = game.odds.spread[predictionValue > 0 ? 'homeOdds' : 'awayOdds'];
    odds = ` (${spreadOdds})`;
    betDescription = `${predictionValue > 0 ? game.homeTeamName : game.awayTeamName} ${predictionValue}`;
  } else if (prediction.predictionType === 'TOTAL' && game.odds?.total) {
    const totalOdds = game.odds.total[predictionValue > game.odds.total.overUnder ? 'overOdds' : 'underOdds'];
    odds = ` (${totalOdds})`;
    betDescription = `${game.odds.total.overUnder} ${predictionValue > game.odds.total.overUnder ? 'OVER' : 'UNDER'}`;
  } else if (prediction.predictionType === 'MONEYLINE' && game.odds?.moneyline) {
    const mlOdds = game.odds.moneyline[predictionValue > 0 ? 'homeOdds' : 'awayOdds'];
    odds = ` (${mlOdds})`;
    betDescription = `${predictionValue > 0 ? game.homeTeamName : game.awayTeamName} ML`;
  }

  return `${matchup}\n${betDescription}${odds} (Grade: ${grade}, Confidence: ${confidencePercentage}%)`;
};

const generatePicks = async (): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const games = await prisma.game.findMany({
      where: {
        gameDate: {
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
        predictions: true
      }
    }) as GameWithOdds[];

    console.log(`Found ${games.length} games`);

    const picksBySportAndGrade = initializePicksBySportAndGrade();
    const seenPicks = new Set<string>();

    for (const game of games) {
      const gameTime = game.startTime ? new Date(game.startTime).toLocaleTimeString() : 'TBD';
      const matchup = `${game.awayTeamName} @ ${game.homeTeamName} (${gameTime})`;
      
      // Group predictions by type to avoid duplicates
      const predictionsByType = new Map<PredictionType, Prediction>();
      
      for (const prediction of game.predictions) {
        const grade = getConfidenceGrade(prediction.confidence);
        if (!grade) continue;
        
        // Only keep the highest confidence prediction for each type
        const existingPrediction = predictionsByType.get(prediction.predictionType);
        if (!existingPrediction || prediction.confidence > existingPrediction.confidence) {
          predictionsByType.set(prediction.predictionType, prediction);
        }
      }
      
      // Process the filtered predictions
      for (const prediction of predictionsByType.values()) {
        const grade = getConfidenceGrade(prediction.confidence);
        if (!grade) continue;
        
        const formattedPick = formatPrediction({ ...prediction, grade }, game, matchup);
        const pickKey = `${matchup}-${prediction.predictionType}`;
        
        if (!seenPicks.has(pickKey) && (game.sport === 'MLB' || game.sport === 'NBA')) {
          seenPicks.add(pickKey);
          picksBySportAndGrade[game.sport as SportType][grade].push({
            pick: formattedPick,
            confidence: prediction.confidence
          });
        }
      }
    }

    // Sort picks by confidence
    (Object.keys(picksBySportAndGrade) as SportType[]).forEach((sport) => {
      Object.keys(picksBySportAndGrade[sport]).forEach((grade) => {
        if (grade in picksBySportAndGrade[sport]) {
          const picks = picksBySportAndGrade[sport][grade as Grade];
          picks.sort((a, b) => b.confidence - a.confidence);
        }
      });
    });

    let output = `Daily Picks for ${today.toLocaleDateString()}\n\n`;

    (Object.keys(picksBySportAndGrade) as SportType[]).forEach((sport) => {
      const hasPicks = Object.values(picksBySportAndGrade[sport]).some(picks => picks.length > 0);
      if (hasPicks) {
        output += `${sport} Picks:\n`;
        Object.keys(picksBySportAndGrade[sport]).forEach((grade) => {
          if (grade in picksBySportAndGrade[sport]) {
            const picks = picksBySportAndGrade[sport][grade as Grade];
            if (picks && picks.length > 0) {
              output += `${grade} Ratings\n`;
              picks.forEach(({pick}) => {
                output += `${pick}\n`;
              });
              output += '\n';
            }
          }
        });
        output += '-'.repeat(50) + '\n\n';
      }
    });

    // Save picks to file
    const filePath = join(__dirname, '../../todays-picks.txt');
    writeFileSync(filePath, output);
    console.log(`Picks saved to ${filePath}`);

    // Send picks via WhatsApp if recipient is set
    const recipient = process.env.WHATSAPP_RECIPIENT;
    if (recipient) {
      const formattedNumber = formatWhatsAppNumber(recipient);
      await sendWhatsAppMessage(formattedNumber, output);
      console.log('WhatsApp message sent successfully');
    }

    console.log('All picks generated successfully');
  } catch (error) {
    console.error('Error generating picks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

generatePicks().catch(console.error); 