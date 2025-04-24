import { PrismaClient, PredictionType, PredictionOutcome, SportType, GameStatus } from '@prisma/client';
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

interface GameData {
  id: string;
  sport: SportType;
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  predictions: Map<PredictionType, {
    value: string;
    confidence: number;
    createdAt: Date;
  }>;
}

function parseTeams(teamsString: string): { homeTeam: string; awayTeam: string } {
  const teams = teamsString.split(' vs ');
  return {
    awayTeam: teams[0].trim(),
    homeTeam: teams[1].trim()
  };
}

function parseScore(scoreString: string): { homeScore: number | null; awayScore: number | null } {
  if (scoreString === 'No scores' || !scoreString) {
    return { homeScore: null, awayScore: null };
  }
  const scores = scoreString.split('-').map(s => parseInt(s.trim()));
  return {
    homeScore: scores[0],
    awayScore: scores[1]
  };
}

function generateGameId(date: string, teams: string, sport: string): string {
  const { homeTeam, awayTeam } = parseTeams(teams);
  return `${sport}_${homeTeam.replace(/\s+/g, '')}_${awayTeam.replace(/\s+/g, '')}_${date}`;
}

function generatePredictionId(gameId: string, predictionType: PredictionType): string {
  return `${gameId}_${predictionType}`;
}

function calculateOutcome(
  predictionType: PredictionType,
  predictionValue: string,
  homeScore: number | null,
  awayScore: number | null,
  status: GameStatus
): PredictionOutcome {
  if (status !== GameStatus.FINAL || homeScore === null || awayScore === null) {
    return PredictionOutcome.PENDING;
  }

  switch (predictionType) {
    case PredictionType.MONEYLINE:
      const predictedHomeWin = predictionValue === '1';
      const actualHomeWin = homeScore > awayScore;
      return predictedHomeWin === actualHomeWin ? PredictionOutcome.WIN : PredictionOutcome.LOSS;

    case PredictionType.SPREAD:
      const spread = parseFloat(predictionValue);
      const spreadResult = homeScore + spread - awayScore;
      if (spreadResult === 0) return PredictionOutcome.PUSH;
      return spreadResult > 0 ? PredictionOutcome.WIN : PredictionOutcome.LOSS;

    case PredictionType.TOTAL:
      const total = parseFloat(predictionValue);
      const actualTotal = homeScore + awayScore;
      if (actualTotal === total) return PredictionOutcome.PUSH;
      return actualTotal > total ? PredictionOutcome.WIN : PredictionOutcome.LOSS;

    default:
      return PredictionOutcome.PENDING;
  }
}

// Add a function to determine if a team is an NBA team
function isNBATeam(team: string): boolean {
  const nbaTeams = new Set([
    'Hawks', 'Celtics', 'Nets', 'Hornets', 'Bulls', 'Cavaliers', 'Mavericks',
    'Nuggets', 'Pistons', 'Warriors', 'Rockets', 'Pacers', 'Clippers', 'Lakers',
    'Grizzlies', 'Heat', 'Bucks', 'Timberwolves', 'Pelicans', 'Knicks', 'Thunder',
    'Magic', '76ers', 'Suns', 'Trail Blazers', 'Kings', 'Spurs', 'Raptors', 'Jazz',
    'Wizards'
  ]);
  
  return team.split(' ').some(word => nbaTeams.has(word));
}

function determineSport(teams: string): SportType {
  const { homeTeam, awayTeam } = parseTeams(teams);
  return isNBATeam(homeTeam) || isNBATeam(awayTeam) ? SportType.NBA : SportType.MLB;
}

function normalizeConfidence(value: string): number {
  const num = parseFloat(value);
  // If the number is greater than 1, assume it's a percentage
  return num > 1 ? num / 100 : num;
}

async function reconstructDatabase() {
  try {
    const readFile = promisify(fs.readFile);
    const csvData = await readFile('predictions-audit.csv', 'utf-8');
    
    const parser = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });

    const games = new Map<string, GameData>();
    let mlbGames = 0;
    let nbaGames = 0;

    // First pass: Collect all games and their predictions
    for await (const record of parser) {
      const sport = determineSport(record['Teams']);
      const gameId = generateGameId(record['Game Date'], record['Teams'], sport);
      const { homeTeam, awayTeam } = parseTeams(record['Teams']);
      const { homeScore, awayScore } = parseScore(record['Actual Score']);
      
      if (!games.has(gameId)) {
        games.set(gameId, {
          id: gameId,
          sport,
          date: new Date(record['Game Date']),
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          status: record['Game Status'] as GameStatus,
          predictions: new Map()
        });
        
        if (sport === SportType.MLB) {
          mlbGames++;
        } else {
          nbaGames++;
        }
      }

      const game = games.get(gameId)!;
      const predictionType = record['Bet Type'] as PredictionType;
      
      // Only keep the first prediction of each type
      if (!game.predictions.has(predictionType)) {
        game.predictions.set(predictionType, {
          value: record['Prediction Value'],
          confidence: normalizeConfidence(record['Confidence']),
          createdAt: new Date(record['Created At'])
        });
      }
    }

    console.log(`Found ${games.size} unique games (${mlbGames} MLB, ${nbaGames} NBA)`);

    // Second pass: Create games and predictions in database
    for (const [gameId, gameData] of games) {
      try {
        // Create or update game
        const game = await prisma.game.upsert({
          where: { id: gameId },
          create: {
            id: gameId,
            sport: gameData.sport,
            homeTeamId: gameData.homeTeam.replace(/\s+/g, ''),
            awayTeamId: gameData.awayTeam.replace(/\s+/g, ''),
            homeTeamName: gameData.homeTeam,
            awayTeamName: gameData.awayTeam,
            gameDate: gameData.date,
            status: gameData.status,
            homeScore: gameData.homeScore,
            awayScore: gameData.awayScore,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          update: {
            status: gameData.status,
            homeScore: gameData.homeScore,
            awayScore: gameData.awayScore,
            updatedAt: new Date()
          }
        });

        // Create predictions
        for (const [predictionType, predData] of gameData.predictions) {
          const predictionId = generatePredictionId(gameId, predictionType);
          const outcome = calculateOutcome(
            predictionType,
            predData.value,
            gameData.homeScore,
            gameData.awayScore,
            gameData.status
          );

          await prisma.prediction.upsert({
            where: { id: predictionId },
            create: {
              id: predictionId,
              gameId: game.id,
              predictionType,
              predictionValue: predData.value,
              confidence: predData.confidence,
              outcome,
              reasoning: '',
              createdAt: predData.createdAt,
              updatedAt: new Date()
            },
            update: {
              predictionValue: predData.value,
              confidence: predData.confidence,
              outcome,
              updatedAt: new Date()
            }
          });
        }

        console.log(`Processed game ${gameId} with ${gameData.predictions.size} predictions`);
      } catch (error) {
        console.error(`Error processing game ${gameId}:`, error);
      }
    }

    console.log('Database reconstruction complete');
  } catch (error) {
    console.error('Error during reconstruction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reconstructDatabase().catch(console.error); 