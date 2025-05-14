import { PrismaClient, GameStatus } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const MLB_TEAMS = [
    'Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox',
    'Chicago Cubs', 'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians',
    'Colorado Rockies', 'Detroit Tigers', 'Houston Astros', 'Kansas City Royals',
    'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins', 'Milwaukee Brewers',
    'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
    'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants',
    'Seattle Mariners', 'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers',
    'Toronto Blue Jays', 'Washington Nationals'
];

async function fixGameData() {
    try {
        console.log('Starting game data fix...');

        // Get all games
        const games = await prisma.game.findMany({
            include: {
                predictions: true
            }
        });

        console.log(`Found ${games.length} total games`);

        // Group games by year
        const gamesByYear = games.reduce((acc, game) => {
            const year = game.gameDate.getFullYear();
            acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        console.log('\nGames by year:');
        Object.entries(gamesByYear).forEach(([year, count]) => {
            console.log(`${year}: ${count} games`);
        });

        let gamesUpdated = 0;

        for (const game of games) {
            const gameDate = new Date(game.gameDate);
            if (gameDate.getFullYear() === 2025) {
                gameDate.setFullYear(2024);
                
                // Create new game ID with correct year
                const oldId = game.id;
                const newId = oldId.replace('2025', '2024');
                
                // Update the game with new date and ID
                await prisma.game.update({
                    where: {
                        id: oldId
                    },
                    data: {
                        gameDate: gameDate,
                        id: newId
                    }
                });

                console.log(`\nUpdated game: ${game.awayTeamName} @ ${game.homeTeamName}`);
                console.log(`  Old date: ${game.gameDate}`);
                console.log(`  New date: ${gameDate}`);
                console.log(`  Old ID: ${oldId}`);
                console.log(`  New ID: ${newId}`);
                
                gamesUpdated++;
            }
        }

        console.log('\nSummary:');
        console.log(`Games updated: ${gamesUpdated}`);

    } catch (error) {
        console.error('Error fixing game data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixGameData()
    .then(() => console.log('Game data fix completed'))
    .catch(console.error); 