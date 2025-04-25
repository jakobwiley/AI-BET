import { PrismaClient, SportType, GameStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface Game {
  id: string;
  sport: SportType;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  gameDate: string;
  status: GameStatus;
  odds?: any;
}

async function fetchGames(sport: string): Promise<Game[]> {
  try {
    const response = await axios.get(`http://localhost:3000/api/games?sport=${sport}`);
    return response.data as Game[];
  } catch (error) {
    console.error(`Error fetching ${sport} games:`, error);
    return [];
  }
}

async function main() {
  try {
    // Fetch both NBA and MLB games
    const [nbaGames, mlbGames] = await Promise.all([
      fetchGames('NBA'),
      fetchGames('MLB')
    ]);

    console.log(`Fetched ${nbaGames.length} NBA games and ${mlbGames.length} MLB games`);

    // Store games in database
    const allGames = [...nbaGames, ...mlbGames];
    let stored = 0;

    for (const game of allGames) {
      await prisma.game.upsert({
        where: { id: game.id },
        create: {
          id: game.id,
          sport: game.sport,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: new Date(game.gameDate),
          status: game.status,
          oddsJson: game.odds || {}
        },
        update: {
          sport: game.sport,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          gameDate: new Date(game.gameDate),
          status: game.status,
          oddsJson: game.odds || {}
        }
      });
      stored++;
    }

    console.log(`Successfully stored ${stored} games in the database`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

main(); 