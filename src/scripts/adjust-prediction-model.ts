import { PrismaClient, PredictionType, PredictionOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function adjustPredictionModel() {
    try {
        // Fetch all MLB games with predictions
        const games = await prisma.game.findMany({
            where: {
                sport: 'MLB',
                status: 'FINAL',
                NOT: {
                    homeScore: null,
                    awayScore: null
                }
            },
            include: {
                predictions: true
            }
        });

        console.log(`Found ${games.length} MLB games with predictions`);

        // Analyze and adjust the model
        for (const game of games) {
            // Fetch team stats separately
            const homeStats = await prisma.teamStats.findUnique({
                where: { teamId: game.homeTeamId }
            });
            const awayStats = await prisma.teamStats.findUnique({
                where: { teamId: game.awayTeamId }
            });

            if (!homeStats || !awayStats) {
                console.log(`Missing team stats for game ${game.id}`);
                continue;
            }

            // Adjust prediction logic based on advanced metrics
            for (const prediction of game.predictions) {
                if (prediction.predictionType === PredictionType.TOTAL) {
                    const totalScore = game.homeScore + game.awayScore;
                    const projectedTotal = (prediction.projectionJson as any)?.projectedTotal || 0;

                    // Adjust confidence based on batting and pitching stats
                    const homeBattingStrength = (homeStats.statsJson as any).battingAverage || 0;
                    const awayBattingStrength = (awayStats.statsJson as any).battingAverage || 0;
                    const homePitchingStrength = (homeStats.statsJson as any).earnedRunAverage || 0;
                    const awayPitchingStrength = (awayStats.statsJson as any).earnedRunAverage || 0;

                    // Example adjustment logic
                    let adjustedConfidence = prediction.confidence;
                    if (Math.abs(totalScore - projectedTotal) < 0.2) {
                        adjustedConfidence = 0.55; // Low confidence for close projections
                    } else if (homeBattingStrength > 0.3 && awayBattingStrength > 0.3) {
                        adjustedConfidence += 0.1; // Increase confidence for strong batting teams
                    } else if (homePitchingStrength < 3.5 && awayPitchingStrength < 3.5) {
                        adjustedConfidence += 0.1; // Increase confidence for strong pitching teams
                    }

                    // Update prediction with adjusted confidence
                    await prisma.prediction.update({
                        where: { id: prediction.id },
                        data: { confidence: adjustedConfidence }
                    });

                    console.log(`Adjusted confidence for prediction ${prediction.id}: ${adjustedConfidence}`);
                }
            }
        }

        console.log('Prediction model adjustment complete.');

    } catch (error) {
        console.error('Error adjusting prediction model:', error);
    } finally {
        await prisma.$disconnect();
    }
}

adjustPredictionModel().catch(console.error); 