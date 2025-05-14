import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function addTodaysGames() {
  const games = [
    {
      homeTeam: 'Minnesota',
      awayTeam: 'Chicago',
      homeTeamId: 'min',
      awayTeamId: 'cws',
      pitchers: ['Chris Paddack', 'Shane Smith'],
      time: '13:00',
      odds: {
        spread: { homeSpread: -1.5, awaySpread: 1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -110, awayOdds: -110 }
      }
    },
    {
      homeTeam: 'Boston',
      awayTeam: 'Seattle',
      homeTeamId: 'bos',
      awayTeamId: 'sea',
      pitchers: ['Garrett Crochet', 'Bryan Woo'],
      time: '13:00',
      odds: {
        spread: { homeSpread: -1.5, awaySpread: 1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -110, awayOdds: -110 }
      }
    },
    {
      homeTeam: 'Kansas City',
      awayTeam: 'Colorado',
      homeTeamId: 'kc',
      awayTeamId: 'col',
      pitchers: ['Cole Ragans', 'German Marquez'],
      time: '13:00',
      odds: {
        spread: { homeSpread: -1.5, awaySpread: 1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -110, awayOdds: -110 }
      }
    },
    {
      homeTeam: 'San Francisco',
      awayTeam: 'Milwaukee',
      homeTeamId: 'sf',
      awayTeamId: 'mil',
      pitchers: ['Landen Roupp', 'Tobias Myers'],
      time: '14:45',
      odds: {
        spread: { homeSpread: -1.5, awaySpread: 1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 7.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -160, awayOdds: 140 }
      }
    },
    {
      homeTeam: 'Kansas City',
      awayTeam: 'Colorado',
      homeTeamId: 'kc',
      awayTeamId: 'col',
      pitchers: ['Michael Lorenzen', 'Chase Dollander'],
      time: '16:10',
      odds: {
        spread: { homeSpread: -1.5, awaySpread: 1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -190, awayOdds: 170 }
      }
    },
    {
      homeTeam: 'Washington',
      awayTeam: 'Baltimore',
      homeTeamId: 'wsh',
      awayTeamId: 'bal',
      pitchers: ['MacKenzie Gore', 'Cade Povich'],
      time: '17:45',
      odds: {
        spread: { homeSpread: 1.5, awaySpread: -1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: 120, awayOdds: -120 }
      }
    },
    {
      homeTeam: 'Los Angeles',
      awayTeam: 'Pittsburgh',
      homeTeamId: 'laa',
      awayTeamId: 'pit',
      pitchers: ['Tyler Anderson', 'Carmen Mlodzinski'],
      time: '20:29',
      odds: {
        spread: { homeSpread: -1.5, awaySpread: 1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -155, awayOdds: 135 }
      }
    },
    {
      homeTeam: 'Arizona',
      awayTeam: 'Tampa Bay',
      homeTeamId: 'ari',
      awayTeamId: 'tb',
      pitchers: ['Corbin Burnes', 'Drew Rasmussen'],
      time: '20:40',
      odds: {
        spread: { homeSpread: 1.5, awaySpread: -1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -135, awayOdds: 115 }
      }
    },
    {
      homeTeam: 'Athletics',
      awayTeam: 'Texas',
      homeTeamId: 'oak',
      awayTeamId: 'tex',
      pitchers: ['J.T. Ginn', 'Jacob deGrom'],
      time: '21:05',
      odds: {
        spread: { homeSpread: 1.5, awaySpread: -1.5, homeOdds: -110, awayOdds: -110 },
        total: { overUnder: 8.5, overOdds: -110, underOdds: -110 },
        moneyline: { homeOdds: -135, awayOdds: 115 }
      }
    }
  ];

  console.log('Adding games for today...');

  for (const game of games) {
    const gameDate = new Date();
    const [hours, minutes] = game.time.split(':');
    gameDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    await prisma.game.create({
      data: {
        id: uuidv4(),
        sport: 'MLB',
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        homeTeamName: game.homeTeam,
        awayTeamName: game.awayTeam,
        gameDate: gameDate.toISOString(),
        startTime: game.time,
        status: 'SCHEDULED',
        probableHomePitcherName: game.pitchers[0],
        probableAwayPitcherName: game.pitchers[1],
        odds: {
          spread: game.odds.spread,
          total: game.odds.total,
          moneyline: game.odds.moneyline
        }
      }
    });

    console.log(`Added game: ${game.awayTeam} @ ${game.homeTeam}`);
  }

  console.log('All games added successfully');
}

// Run if called directly
(async () => {
  try {
    await addTodaysGames();
  } catch (error) {
    console.error('Error adding games:', error);
  } finally {
    await prisma.$disconnect();
  }
})(); 