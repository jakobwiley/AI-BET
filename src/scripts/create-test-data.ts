import { PrismaClient, SportType, PredictionType, GameStatus, PredictionOutcome, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  // Create test games with different scenarios
  const games = [
    // Game with a tie (for moneyline PUSH)
    {
      id: 'test-game-1',
      sport: SportType.MLB,
      homeTeamId: '1',
      awayTeamId: '2',
      homeTeamName: 'Team A',
      awayTeamName: 'Team B',
      gameDate: new Date('2024-04-23'),
      status: GameStatus.FINAL,
      homeScore: 5,
      awayScore: 5
    },
    // Game with exact spread match (for spread PUSH)
    {
      id: 'test-game-2',
      sport: SportType.MLB,
      homeTeamId: '3',
      awayTeamId: '4',
      homeTeamName: 'Team C',
      awayTeamName: 'Team D',
      gameDate: new Date('2024-04-23'),
      status: GameStatus.FINAL,
      homeScore: 7,
      awayScore: 4
    },
    // Game with exact total match (for total PUSH)
    {
      id: 'test-game-3',
      sport: SportType.MLB,
      homeTeamId: '5',
      awayTeamId: '6',
      homeTeamName: 'Team E',
      awayTeamName: 'Team F',
      gameDate: new Date('2024-04-23'),
      status: GameStatus.FINAL,
      homeScore: 4,
      awayScore: 6
    }
  ];

  for (const game of games) {
    await prisma.game.create({
      data: game
    });
  }

  // Create predictions for each game
  const predictions: Prisma.PredictionCreateInput[] = [
    // Game 1 predictions (tie game)
    {
      game: { connect: { id: 'test-game-1' } },
      predictionType: PredictionType.MONEYLINE,
      predictionValue: '100', // Predicting home team
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    {
      game: { connect: { id: 'test-game-1' } },
      predictionType: PredictionType.SPREAD,
      predictionValue: '-1.5',
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    {
      game: { connect: { id: 'test-game-1' } },
      predictionType: PredictionType.TOTAL,
      predictionValue: 'over 10',
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    // Game 2 predictions (spread push)
    {
      game: { connect: { id: 'test-game-2' } },
      predictionType: PredictionType.MONEYLINE,
      predictionValue: '100',
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    {
      game: { connect: { id: 'test-game-2' } },
      predictionType: PredictionType.SPREAD,
      predictionValue: '3', // Home team won by 3, matching spread
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    {
      game: { connect: { id: 'test-game-2' } },
      predictionType: PredictionType.TOTAL,
      predictionValue: 'over 11',
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    // Game 3 predictions (total push)
    {
      game: { connect: { id: 'test-game-3' } },
      predictionType: PredictionType.MONEYLINE,
      predictionValue: '-100',
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    {
      game: { connect: { id: 'test-game-3' } },
      predictionType: PredictionType.SPREAD,
      predictionValue: '1.5',
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    },
    {
      game: { connect: { id: 'test-game-3' } },
      predictionType: PredictionType.TOTAL,
      predictionValue: 'over 10', // Total is exactly 10
      confidence: 75,
      reasoning: 'Test prediction',
      outcome: PredictionOutcome.PENDING
    }
  ];

  for (const prediction of predictions) {
    await prisma.prediction.create({
      data: prediction
    });
  }

  console.log('Test data created successfully');
}

createTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 