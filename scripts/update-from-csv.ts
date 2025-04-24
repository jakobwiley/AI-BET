import { PrismaClient, GameStatus, PredictionType, PredictionOutcome, SportType } from '@prisma/client';
import fs from 'fs';
import { parse } from 'csv-parse';
import { promisify } from 'util';

const prisma = new PrismaClient();

interface CSVRecord {
  'Game Date': string;
  'Sport': string;
  'Teams': string;
  'Actual Score': string;
  'Game Status': string;
  'Bet Type': string;
  'Prediction Value': string;
  'Confidence': string;
  'Current Outcome': string;
  'Has Scores': string;
  'Created At': string;
}

interface GameScores {
  homeScore: number;
  awayScore: number;
}

function parseScore(scoreString: string): GameScores | null {
  if (scoreString === 'No scores' || !scoreString) {
    return null;
  }
  const [away, home] = scoreString.split('-').map(s => parseInt(s.trim()));
  return { homeScore: home, awayScore: away };
}

function calculateOutcome(
  predictionType: PredictionType,
  predictionValue: string,
  homeScore: number,
  awayScore: number
): PredictionOutcome {
  switch (predictionType) {
    case PredictionType.MONEYLINE:
      const predictedHomeWin = predictionValue === '1';
      const actualHomeWin = homeScore > awayScore;
      return predictedHomeWin === actualHomeWin ? PredictionOutcome.WIN : PredictionOutcome.LOSS;

    case PredictionType.SPREAD:
      const spread = parseFloat(predictionValue);
      const spreadResult = homeScore + spread - awayScore;
      if (Math.abs(spreadResult) < 0.0001) return PredictionOutcome.PUSH;
      return spreadResult > 0 ? PredictionOutcome.WIN : PredictionOutcome.LOSS;

    case PredictionType.TOTAL:
      const total = parseFloat(predictionValue);
      const actualTotal = homeScore + awayScore;
      
      if (Math.abs(actualTotal - total) < 0.0001) return PredictionOutcome.PUSH;
      return actualTotal > total ? PredictionOutcome.WIN : PredictionOutcome.LOSS;

    default:
      return PredictionOutcome.PENDING;
  }
}

async function updateFromCSV() {
  try {
    const readFile = promisify(fs.readFile);
    const csvData = await readFile('predictions-audit.csv', 'utf-8');
    
    const records: CSVRecord[] = await new Promise((resolve, reject) => {
      parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        cast: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    // Group records by game
    const gameMap = new Map<string, CSVRecord>();
    records.forEach(record => {
      const gameKey = `${record['Game Date']}_${record['Teams']}`;
      if (!gameMap.has(gameKey)) {
        gameMap.set(gameKey, record);
      }
    });

    console.log(`Found ${gameMap.size} unique games in CSV`);
    let updatedGames = 0;
    let scheduledGames = 0;
    let createdGames = 0;

    // Process each game
    for (const [gameKey, record] of gameMap) {
      const [awayTeam, homeTeam] = record['Teams'].split(' vs ');
      const gameId = `MLB_${homeTeam.replace(/\s+/g, '')}_${awayTeam.replace(/\s+/g, '')}_${record['Game Date']}`;
      const scores = parseScore(record['Actual Score']);
      
      try {
        // Try to update existing game
        if (scores) {
          await prisma.game.upsert({
            where: { id: gameId },
            update: {
              homeScore: scores.homeScore,
              awayScore: scores.awayScore,
              status: GameStatus.FINAL,
              updatedAt: new Date()
            },
            create: {
              id: gameId,
              sport: SportType.MLB,
              homeTeamId: homeTeam.replace(/\s+/g, ''),
              awayTeamId: awayTeam.replace(/\s+/g, ''),
              homeTeamName: homeTeam,
              awayTeamName: awayTeam,
              gameDate: new Date(record['Game Date']),
              status: GameStatus.FINAL,
              homeScore: scores.homeScore,
              awayScore: scores.awayScore,
              createdAt: new Date(record['Created At']),
              updatedAt: new Date()
            }
          });

          // Get all predictions for this game
          const predictions = await prisma.prediction.findMany({
            where: { gameId }
          });

          // Update prediction outcomes
          for (const prediction of predictions) {
            const outcome = calculateOutcome(
              prediction.predictionType,
              prediction.predictionValue.toString(),
              scores.homeScore,
              scores.awayScore
            );

            await prisma.prediction.update({
              where: { id: prediction.id },
              data: {
                outcome,
                updatedAt: new Date()
              }
            });
          }

          console.log(`Updated game ${gameId} with scores ${scores.awayScore}-${scores.homeScore}`);
          updatedGames++;
        } else {
          // Mark or create game as scheduled
          await prisma.game.upsert({
            where: { id: gameId },
            update: {
              status: GameStatus.SCHEDULED,
              updatedAt: new Date()
            },
            create: {
              id: gameId,
              sport: SportType.MLB,
              homeTeamId: homeTeam.replace(/\s+/g, ''),
              awayTeamId: awayTeam.replace(/\s+/g, ''),
              homeTeamName: homeTeam,
              awayTeamName: awayTeam,
              gameDate: new Date(record['Game Date']),
              status: GameStatus.SCHEDULED,
              createdAt: new Date(record['Created At']),
              updatedAt: new Date()
            }
          });

          // Mark predictions as pending
          await prisma.prediction.updateMany({
            where: { gameId },
            data: {
              outcome: PredictionOutcome.PENDING,
              updatedAt: new Date()
            }
          });

          console.log(`Marked game ${gameId} as scheduled`);
          scheduledGames++;
        }
      } catch (error) {
        console.error(`Error processing game ${gameId}:`, error);
      }
    }

    console.log('\nUpdate complete:');
    console.log(`- ${updatedGames} games updated with scores`);
    console.log(`- ${scheduledGames} games marked as scheduled`);
    console.log(`- ${createdGames} new games created`);

  } catch (error) {
    console.error('Error updating from CSV:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateFromCSV().catch(console.error); 