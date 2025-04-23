const { PrismaClient } = require('@prisma/client');
const { SportsApiService } = require('../src/lib/sportsApi');

const prisma = new PrismaClient();

async function fetchInitialData() {
  try {
    console.log('🔄 Fetching initial data...');

    // Fetch MLB games
    console.log('⚾ Fetching MLB games...');
    const mlbGames = await SportsApiService.getUpcomingGames('MLB');
    console.log(`Found ${mlbGames.length} MLB games`);

    // Fetch NBA games
    console.log('🏀 Fetching NBA games...');
    const nbaGames = await SportsApiService.getUpcomingGames('NBA');
    console.log(`Found ${nbaGames.length} NBA games`);

    const allGames = [...mlbGames, ...nbaGames];

    // Save/update games in database
    console.log('💾 Saving games to database...');
    for (const game of allGames) {
      await prisma.game.upsert({
        where: { id: game.id },
        update: {
          sport: game.sport,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: game.gameDate,
          startTime: game.startTime,
          status: game.status
        },
        create: {
          id: game.id,
          sport: game.sport,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: game.gameDate,
          startTime: game.startTime,
          status: game.status
        }
      });
    }
    console.log(`✅ Saved ${allGames.length} games`);

    // Generate initial predictions for each game
    console.log('🎲 Generating predictions...');
    for (const game of allGames) {
      // Get predictions
      const predictions = await SportsApiService.getPredictionsForGame(game.id);
      
      // Save predictions
      for (const prediction of predictions) {
        await prisma.prediction.upsert({
          where: { id: prediction.id },
          update: {
            gameId: prediction.gameId,
            predictionType: prediction.predictionType,
            predictionValue: prediction.predictionValue,
            confidence: prediction.confidence,
            reasoning: prediction.reasoning,
            grade: prediction.grade,
            createdAt: prediction.createdAt
          },
          create: {
            id: prediction.id,
            gameId: prediction.gameId,
            predictionType: prediction.predictionType,
            predictionValue: prediction.predictionValue,
            confidence: prediction.confidence,
            reasoning: prediction.reasoning,
            grade: prediction.grade,
            createdAt: prediction.createdAt
          }
        });
      }

      // Get player props
      const playerProps = await SportsApiService.getPlayerPropsForGame(game.id, game.sport);

      // Save player props
      for (const prop of playerProps) {
        await prisma.playerProp.upsert({
          where: { id: prop.id },
          update: {
            gameId: prop.gameId,
            playerId: prop.playerId,
            playerName: prop.playerName,
            teamId: prop.teamId,
            propType: prop.propType,
            line: prop.line,
            prediction: prop.prediction,
            confidence: prop.confidence,
            reasoning: prop.reasoning,
            outcome: prop.outcome,
            createdAt: prop.createdAt
          },
          create: {
            id: prop.id,
            gameId: prop.gameId,
            playerId: prop.playerId,
            playerName: prop.playerName,
            teamId: prop.teamId,
            propType: prop.propType,
            line: prop.line,
            prediction: prop.prediction,
            confidence: prop.confidence,
            reasoning: prop.reasoning,
            outcome: prop.outcome,
            createdAt: prop.createdAt
          }
        });
      }
    }
    console.log('✅ Initial data fetch complete!');

    // Log NBA predictions
    console.log('\n🏀 Fetching NBA games and predictions...\n');
    for (const game of nbaGames) {
      console.log(`\n📊 ${game.homeTeamName} vs ${game.awayTeamName} (${game.gameDate})`);
      
      const predictions = await SportsApiService.getPredictionsForGame(game.id);
      console.log('Predictions:');
      for (const pred of predictions) {
        console.log(`  ${pred.predictionType}:`);
        console.log(`    Value: ${pred.predictionValue}`);
        console.log(`    Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
        console.log(`    Reasoning: ${pred.reasoning}\n`);
      }

      const props = await SportsApiService.getPlayerPropsForGame(game.id, 'NBA');
      console.log('Player Props:');
      for (const prop of props) {
        console.log(`  ${prop.playerName} - ${prop.propType}:`);
        console.log(`    Line: ${prop.line}`);
        console.log(`    Prediction: ${prop.prediction}`);
        console.log(`    Confidence: ${prop.confidence}%`);
        console.log(`    Reasoning: ${prop.reasoning}\n`);
      }
      console.log('----------------------------------------');
    }

  } catch (error) {
    console.error('❌ Error fetching initial data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fetchInitialData()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 