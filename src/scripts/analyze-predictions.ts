import { PrismaClient, GameStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePredictions() {
    try {
        const predictions = await prisma.prediction.findMany({
            where: {
                game: {
                    status: GameStatus.FINAL,
                    NOT: {
                        homeScore: null,
                        awayScore: null
                    }
                }
            },
            include: {
                game: true
            }
        });

        const totalPredictions = predictions.length;
        const wins = predictions.filter(p => p.outcome === 'WIN').length;
        const losses = predictions.filter(p => p.outcome === 'LOSS').length;
        const pushes = predictions.filter(p => p.outcome === 'PUSH').length;
        const pending = predictions.filter(p => p.outcome === 'PENDING').length;

        console.log(`Total Predictions: ${totalPredictions}`);
        console.log(`Wins: ${wins}`);
        console.log(`Losses: ${losses}`);
        console.log(`Pushes: ${pushes}`);
        console.log(`Pending: ${pending}`);
        console.log(`Win Rate: ${((wins / (wins + losses)) * 100).toFixed(2)}%`);

        // Performance by type
        const byType = predictions.reduce((acc, pred) => {
            if (!acc[pred.predictionType]) {
                acc[pred.predictionType] = { wins: 0, losses: 0, pushes: 0, total: 0 };
            }
            acc[pred.predictionType].total++;
            if (pred.outcome === 'WIN') acc[pred.predictionType].wins++;
            if (pred.outcome === 'LOSS') acc[pred.predictionType].losses++;
            if (pred.outcome === 'PUSH') acc[pred.predictionType].pushes++;
            return acc;
        }, {} as Record<string, { wins: number; losses: number; pushes: number; total: number }>);

        console.log('\nPerformance by Type:');
        Object.entries(byType).forEach(([type, stats]) => {
            const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(2);
            console.log(`${type}:`);
            console.log(`  Total: ${stats.total}`);
            console.log(`  Wins: ${stats.wins}`);
            console.log(`  Losses: ${stats.losses}`);
            console.log(`  Pushes: ${stats.pushes}`);
            console.log(`  Win Rate: ${winRate}%`);
        });

    } catch (error) {
        console.error('Error analyzing predictions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

analyzePredictions().catch(console.error); 