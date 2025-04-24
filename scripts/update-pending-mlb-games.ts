import { PrismaClient, GameStatus, SportType, PredictionType, PredictionOutcome } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface MLBScheduleResponse {
  dates: Array<{
    games: Array<{
      gamePk: number;
      teams: {
        away: { team: { name: string }; score: number };
        home: { team: { name: string }; score: number };
      };
      status: { abstractGameState: string };
    }>;
  }>;
}

async function fetchMLBGames(date: string): Promise<Map<string, { homeScore: number; awayScore: number }> | null> {
  try {
    const response = await axios.get<MLBScheduleResponse>(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=team,linescore`
    );

    if (!response.data.dates || response.data.dates.length === 0) {
      console.log(`No games found for date ${date}`);
      return null;
    }

    const gameScores = new Map<string, { homeScore: number; awayScore: number }>();
    
    response.data.dates[0].games.forEach(game => {
      if (game.status.abstractGameState === 'Final') {
        const homeTeam = game.teams.home.team.name.replace(/\s+/g, '');
        const awayTeam = game.teams.away.team.name.replace(/\s+/g, '');
        const key = `MLB_${homeTeam}_${awayTeam}_${date}`;
        
        gameScores.set(key, {
          homeScore: game.teams.home.score,
          awayScore: game.teams.away.score
        });
      }
    });

    return gameScores;
  } catch (error) {
    console.error(`Error fetching MLB games for date ${date}:`, error.message);
    return null;
  }
}

async function updatePendingGames() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Find all MLB games that need updating
    const pendingGames = await prisma.game.findMany({
      where: {
        sport: SportType.MLB,
        OR: [
          { status: GameStatus.SCHEDULED },
          {
            AND: [
              { status: GameStatus.FINAL },
              {
                OR: [
                  { homeScore: null },
                  { awayScore: null }
                ]
              }
            ]
          }
        ]
      },
      include: {
        predictions: true
      }
    });

    console.log(`Found ${pendingGames.length} MLB games to process`);

    // Group games by past/future
    const pastGames = pendingGames.filter(game => game.gameDate < today);
    const futureGames = pendingGames.filter(game => game.gameDate >= today);

    console.log(`${pastGames.length} past games to update scores`);
    console.log(`${futureGames.length} future games to mark as scheduled`);

    // Update future games to SCHEDULED
    if (futureGames.length > 0) {
      await prisma.game.updateMany({
        where: {
          id: {
            in: futureGames.map(g => g.id)
          }
        },
        data: {
          status: GameStatus.SCHEDULED
        }
      });

      // Update their predictions to PENDING
      await prisma.prediction.updateMany({
        where: {
          gameId: {
            in: futureGames.map(g => g.id)
          }
        },
        data: {
          outcome: PredictionOutcome.PENDING
        }
      });

      console.log('Updated future games to SCHEDULED and predictions to PENDING');
    }

    // Group past games by date
    const gamesByDate = new Map<string, typeof pastGames>();
    pastGames.forEach(game => {
      const dateStr = game.gameDate.toISOString().split('T')[0];
      if (!gamesByDate.has(dateStr)) {
        gamesByDate.set(dateStr, []);
      }
      gamesByDate.get(dateStr)!.push(game);
    });

    // Process each past date
    for (const [date, games] of gamesByDate) {
      console.log(`\nProcessing games for date: ${date}`);
      const gameScores = await fetchMLBGames(date);
      
      if (!gameScores) {
        console.log(`No scores available for ${date}`);
        continue;
      }

      // Update each game for this date
      for (const game of games) {
        console.log(`\nProcessing game: ${game.awayTeamName} vs ${game.homeTeamName}`);
        
        const scores = gameScores.get(game.id);
        if (scores) {
          // Update game with scores and status
          await prisma.game.update({
            where: { id: game.id },
            data: {
              homeScore: scores.homeScore,
              awayScore: scores.awayScore,
              status: GameStatus.FINAL,
              updatedAt: new Date()
            }
          });

          console.log(`Updated scores: ${scores.awayScore}-${scores.homeScore}`);

          // Recalculate outcomes for all predictions of this game
          for (const prediction of game.predictions) {
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

            console.log(`Updated prediction ${prediction.id} outcome to ${outcome}`);
          }
        } else {
          console.log(`No scores found for game ${game.id}`);
        }
      }
    }

    console.log('\nUpdate complete');
  } catch (error) {
    console.error('Error updating pending games:', error);
  } finally {
    await prisma.$disconnect();
  }
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
      const [position, total] = predictionValue.split(' ');
      const actualTotal = homeScore + awayScore;
      const totalValue = parseFloat(total);
      
      if (Math.abs(actualTotal - totalValue) < 0.0001) return PredictionOutcome.PUSH;
      if (position === 'OVER') {
        return actualTotal > totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      } else {
        return actualTotal < totalValue ? PredictionOutcome.WIN : PredictionOutcome.LOSS;
      }

    default:
      return PredictionOutcome.PENDING;
  }
}

updatePendingGames().catch(console.error); 