import { PrismaClient, SportType } from '@prisma/client';
import { YahooSportsService } from '../src/lib/yahooSportsApi';
import EmailService from '../src/lib/emailService';
import { PredictionService } from '../src/lib/predictionService';

const prisma = new PrismaClient();
const emailService = new EmailService();

async function generateDailyPicks() {
  try {
    console.log('Starting daily picks generation...');

    // 1. Fetch today's games from Yahoo Sports
    const games = await YahooSportsService.getTodaysGames();
    console.log(`Found ${games.length} games for today`);

    // 2. Fetch odds from Yahoo Sports
    const oddsMap = await YahooSportsService.getTodaysOdds();
    console.log(`Found odds for ${oddsMap.size} games`);

    // 3. Validate team records
    const teamRecords = await YahooSportsService.validateTeamRecords(games);
    console.log(`Validated records for ${teamRecords.size} teams`);

    // 4. Save games to database with odds
    for (const game of games) {
      const odds = oddsMap.get(game.id);
      if (odds) {
        game.oddsJson = odds;
      }

      await prisma.game.upsert({
        where: { id: game.id },
        update: game,
        create: game
      });
    }

    // 5. Generate predictions for each game
    const predictions = [];
    for (const game of games) {
      const gamePredictions = await PredictionService.getPredictionsForGame(game);
      predictions.push(...gamePredictions);
    }

    // 6. Filter predictions by confidence rating
    const highConfidencePredictions = predictions.filter(p => p.confidenceRating >= 0.7);
    console.log(`Generated ${highConfidencePredictions.length} high confidence predictions`);

    // 7. Format predictions for email
    const emailContent = formatPredictionsForEmail(highConfidencePredictions);

    // 8. Send email
    await emailService.sendEmail({
      to: process.env.EMAIL_RECIPIENT || '',
      subject: 'Today\'s High Confidence Picks',
      body: emailContent
    });

    console.log('Daily picks generation completed successfully');
  } catch (error) {
    console.error('Error generating daily picks:', error);
    throw error;
  }
}

function formatPredictionsForEmail(predictions: any[]): string {
  let content = 'Today\'s High Confidence Picks:\n\n';

  for (const pred of predictions) {
    content += `Game: ${pred.awayTeamName} @ ${pred.homeTeamName}\n`;
    content += `Prediction: ${pred.predictedWinner} to win\n`;
    content += `Confidence: ${(pred.confidenceRating * 100).toFixed(1)}%\n`;
    content += `Reasoning: ${pred.reasoning}\n\n`;
  }

  return content;
}

// Run the script
generateDailyPicks()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 