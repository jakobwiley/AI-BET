import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGameIds() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const games = await prisma.game.findMany({
            where: {
                sport: 'MLB',
                gameDate: {
                    gte: thirtyDaysAgo,
                    lte: new Date()
                },
                OR: [
                    { homeScore: null },
                    { awayScore: null }
                ]
            },
            orderBy: {
                gameDate: 'asc'
            }
        });

        console.log(`Found ${games.length} games with missing scores\n`);

        games.forEach(game => {
            const gameDate = game.gameDate.toISOString().split('T')[0];
            console.log(`Game: ${game.awayTeamName} @ ${game.homeTeamName}`);
            console.log(`Date: ${gameDate}`);
            console.log(`ID: ${game.id}`);
            console.log('-------------------');
        });

        // Extract MLB game IDs
        const mlbGameIds = games.map(game => {
            const parts = game.id.split('_');
            return parts[parts.length - 1];
        });

        console.log('\nSample MLB Game IDs:');
        mlbGameIds.slice(0, 5).forEach(id => {
            console.log(id);
        });

    } catch (error) {
        console.error('Error checking game IDs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkGameIds().catch(console.error); 