import { PrismaClient, PredictionType, PredictionOutcome, SportType, GameStatus } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parse';
import { promisify } from 'util';

const prisma = new PrismaClient();

interface CSVRecord {
  'Game ID': string;
  'Sport': string;
  'Bet Type': string;
  'Prediction Value': string;
  'Confidence': string;
  'Current Outcome': string;
  'Created At': string;
}

const predictionTypeMap: Record<string, PredictionType> = {
  'MONEYLINE': PredictionType.MONEYLINE,
  'SPREAD': PredictionType.SPREAD,
  'TOTAL': PredictionType.TOTAL
};

const outcomeMap = {
  'WIN': PredictionOutcome.WIN,
  'LOSS': PredictionOutcome.LOSS,
  'PENDING': PredictionOutcome.PENDING,
  'PUSH': PredictionOutcome.PUSH
};

async function reconstructFromCSV() {
  try {
    const readFile = promisify(fs.readFile);
    const csvData = await readFile('predictions-audit.csv', 'utf-8');
    
    const parser = csv.parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });

    let processedRecords = 0;
    let skippedRecords = 0;

    for await (const record of parser) {
      try {
        // Find the game
        const game = await prisma.game.findUnique({
          where: {
            id: record['Game ID']
          }
        });

        if (!game) {
          console.log(`Game not found for ID: ${record['Game ID']}`);
          skippedRecords++;
          continue;
        }

        // Parse confidence as float and ensure it's between 0 and 1
        const confidenceValue = Math.min(Math.max(parseFloat(record.Confidence || '0') / 100, 0), 1);

        // Create or update prediction
        const prediction = await prisma.prediction.upsert({
          where: {
            id: `${game.id}_${record['Bet Type']}_${Date.now()}`
          },
          create: {
            id: `${game.id}_${record['Bet Type']}_${Date.now()}`,
            gameId: game.id,
            predictionType: predictionTypeMap[record['Bet Type']] || PredictionType.MONEYLINE,
            predictionValue: record['Prediction Value']?.toString() || '',
            confidence: confidenceValue,
            outcome: outcomeMap[record['Current Outcome']] || PredictionOutcome.PENDING,
            reasoning: '',
            createdAt: new Date(record['Created At']),
            updatedAt: new Date()
          },
          update: {
            predictionValue: record['Prediction Value']?.toString() || '',
            confidence: confidenceValue,
            outcome: outcomeMap[record['Current Outcome']] || PredictionOutcome.PENDING,
            updatedAt: new Date()
          }
        });

        processedRecords++;
        console.log(`Processed prediction for game ${game.id}`);
      } catch (error) {
        console.error('Error processing record:', error);
        skippedRecords++;
      }
    }

    console.log(`Reconstruction complete. Processed ${processedRecords} records. Skipped ${skippedRecords} records.`);
  } catch (error) {
    console.error('Error during reconstruction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reconstructFromCSV().catch(console.error); 