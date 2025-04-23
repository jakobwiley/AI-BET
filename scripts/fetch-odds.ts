#!/usr/bin/env node

import { PrismaClient, SportType, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const prisma = new PrismaClient();

// Configuration
const API_KEY = process.env.THE_ODDS_API_KEY;
const BASE_URL = process.env.ODDS_API_HOST || 'https://api.the-odds-api.com/v4';
const SPORT_KEYS = {
  MLB: 'baseball_mlb',
  NBA: 'basketball_nba'
};

type SportKey = 'NBA' | 'MLB';

interface OddsResponse {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>;
    }>;
  }>;
}

interface TransformedOdds {
  sport: SportKey;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  odds: {
    moneyline?: {
      home: number | null;
      away: number | null;
      draw?: number | null;
    };
    spread?: {
      home: number | null;
      away: number | null;
      point: number | null;
    };
    total?: {
      over: number | null;
      under: number | null;
      point: number | null;
    };
  };
}

interface Market {
  key: string;
  outcomes: Array<{
    name: string;
    price: number;
    point?: number;
  }>;
}

interface Bookmaker {
  key: string;
  markets: Market[];
}

interface Event {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: Bookmaker[];
}

async function fetchOddsForSport(sport: SportKey): Promise<TransformedOdds[]> {
  console.log(`Fetching odds for ${sport}...`);
  
  try {
    const sportKey = SPORT_KEYS[sport];
    const response = await axios.get<OddsResponse[]>(`${BASE_URL}/sports/${sportKey}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american',
        dateFormat: 'iso'
      }
    });
    
    if (!response.data || response.data.length === 0) {
      console.log(`No odds available for ${sport}`);
      return [];
    }

    // Filter for games today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return response.data
      .filter(event => {
        const gameDate = new Date(event.commence_time);
        return gameDate >= today && gameDate < tomorrow;
      })
      .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
      .map((event) => {
        const bookmaker = event.bookmakers?.find(b => b.key === 'fanduel') || event.bookmakers?.[0];
        
        if (!bookmaker) {
          return {
            sport: sport,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            startTime: new Date(event.commence_time),
            odds: {}
          };
        }
        
        const markets = bookmaker.markets;
        const h2hMarket = markets.find(m => m.key === 'h2h');
        const spreadsMarket = markets.find(m => m.key === 'spreads');
        const totalsMarket = markets.find(m => m.key === 'totals');
        
        const transformedOdds: TransformedOdds = {
          sport: sport,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          startTime: new Date(event.commence_time),
          odds: {}
        };
        
        if (spreadsMarket?.outcomes?.length === 2) {
          transformedOdds.odds.spread = {
            home: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.point || 0,
            away: spreadsMarket.outcomes.find(o => o.name === event.away_team)?.point || 0,
            point: spreadsMarket.outcomes.find(o => o.name === event.home_team)?.price || -110
          };
        }
        
        if (totalsMarket?.outcomes?.length === 2) {
          transformedOdds.odds.total = {
            over: totalsMarket.outcomes[0]?.point || 0,
            under: totalsMarket.outcomes.find(o => o.name === 'Under')?.price || -110,
            point: totalsMarket.outcomes.find(o => o.name === 'Over')?.price || -110
          };
        }
        
        if (h2hMarket?.outcomes?.length === 2) {
          transformedOdds.odds.moneyline = {
            home: h2hMarket.outcomes.find(o => o.name === event.home_team)?.price || 0,
            away: h2hMarket.outcomes.find(o => o.name === event.away_team)?.price || 0
          };
        }
        
        return transformedOdds;
      });
  } catch (error) {
    console.error(`Error in fetchOddsForSport: ${error}`);
    return [];
  }
}

function transformOdds(event: Event, sport: SportKey): TransformedOdds {
  const bookmaker = event.bookmakers?.find((b: Bookmaker) => b.key === 'fanduel');
  
  const defaultOdds = {
    moneyline: {
      home: 0,
      away: 0
    },
    spread: {
      home: 0,
      away: 0,
      point: -110
    },
    total: {
      over: 0,
      under: -110,
      point: 0
    }
  };

  if (!bookmaker) {
    return {
      sport: sport,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      startTime: new Date(event.commence_time),
      odds: defaultOdds
    };
  }

  const transformedOdds: TransformedOdds = {
    sport: sport,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    startTime: new Date(event.commence_time),
    odds: { ...defaultOdds }
  };

  const markets = bookmaker.markets;
  const h2hMarket = markets.find((m: Market) => m.key === 'h2h');
  const spreadsMarket = markets.find((m: Market) => m.key === 'spreads');
  const totalsMarket = markets.find((m: Market) => m.key === 'totals');
  
  if (spreadsMarket?.outcomes?.length === 2) {
    transformedOdds.odds.spread = {
      home: spreadsMarket.outcomes.find((o: { name: string; point?: number }) => o.name === event.home_team)?.point || 0,
      away: spreadsMarket.outcomes.find((o: { name: string; point?: number }) => o.name === event.away_team)?.point || 0,
      point: spreadsMarket.outcomes.find((o: { name: string; price?: number }) => o.name === event.home_team)?.price || -110
    };
  }
  
  if (totalsMarket?.outcomes?.length === 2) {
    transformedOdds.odds.total = {
      over: totalsMarket.outcomes[0]?.point || 0,
      under: totalsMarket.outcomes.find((o: { name: string; price?: number }) => o.name === 'Under')?.price || -110,
      point: totalsMarket.outcomes.find((o: { name: string; price?: number }) => o.name === 'Over')?.price || -110
    };
  }
  
  if (h2hMarket?.outcomes?.length === 2) {
    transformedOdds.odds.moneyline = {
      home: h2hMarket.outcomes.find((o: { name: string; price?: number }) => o.name === event.home_team)?.price || 0,
      away: h2hMarket.outcomes.find((o: { name: string; price?: number }) => o.name === event.away_team)?.price || 0
    };
  }
  
  return transformedOdds;
}

async function updateGameOdds(game: Prisma.GameGetPayload<{}>, odds: TransformedOdds): Promise<void> {
  await prisma.game.update({
    where: { id: game.id },
    data: {
      oddsJson: {
        spread: odds.odds.spread ? {
          home: odds.odds.spread.home,
          away: odds.odds.spread.away,
          point: odds.odds.spread.point
        } : undefined,
        total: odds.odds.total ? {
          over: odds.odds.total.over,
          under: odds.odds.total.under,
          point: odds.odds.total.point
        } : undefined,
        moneyline: odds.odds.moneyline ? {
          home: odds.odds.moneyline.home,
          away: odds.odds.moneyline.away
        } : undefined
      }
    }
  });
}

async function main() {
  try {
    console.log('Starting odds fetch for today...');

    // Fetch MLB odds
    const mlbOdds = await fetchOddsForSport('MLB');
    console.log(`Found ${mlbOdds.length} MLB games`);
    
    // Fetch NBA odds
    const nbaOdds = await fetchOddsForSport('NBA');
    console.log(`Found ${nbaOdds.length} NBA games`);

    // Update or create games in database
    for (const odds of [...mlbOdds, ...nbaOdds]) {
      const game = await prisma.game.findFirst({
        where: {
          homeTeamName: odds.homeTeam,
          awayTeamName: odds.awayTeam,
          gameDate: {
            gte: new Date(new Date(odds.startTime).setHours(0, 0, 0, 0)),
            lt: new Date(new Date(odds.startTime).setHours(23, 59, 59, 999))
          }
        }
      });

      if (game) {
        await updateGameOdds(game, odds);
        console.log(`Updated odds for ${game.homeTeamName} vs ${game.awayTeamName}`);
      } else {
        // Create new game with a unique ID based on teams and date
        const gameId = `${odds.sport}_${odds.homeTeam.replace(/\s+/g, '')}_${odds.awayTeam.replace(/\s+/g, '')}_${odds.startTime.toISOString().split('T')[0]}`;
        
        // Create new game
        const newGame = await prisma.game.create({
          data: {
            id: gameId,
            sport: odds.sport as SportType,
            homeTeamId: odds.homeTeam.replace(/\s+/g, ''),  // Using simplified team name as ID
            awayTeamId: odds.awayTeam.replace(/\s+/g, ''),  // Using simplified team name as ID
            homeTeamName: odds.homeTeam,
            awayTeamName: odds.awayTeam,
            gameDate: odds.startTime,
            status: 'SCHEDULED',
            oddsJson: odds.odds
          }
        });
        console.log(`Created new game: ${newGame.homeTeamName} vs ${newGame.awayTeamName}`);
      }
    }

    console.log('Completed successfully');
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);