import { Game, PlayerProp, Prediction, SportType, PlayerPropType } from '@/models/types';
import { v4 as uuidv4 } from 'uuid';

export const getMockGames = (sport: SportType): Game[] => {
  if (sport === 'NBA') {
    return [{
      id: 'SAC-DET-20250407',
      sport: 'NBA',
      homeTeamId: 'DET',
      awayTeamId: 'SAC',
      homeTeamName: 'Detroit Pistons',
      awayTeamName: 'Sacramento Kings',
      gameDate: '2025-04-07',
      startTime: '2025-04-07T23:10:00Z',
      status: 'scheduled',
      odds: {
        spread: {
          home: { line: -6.5, odds: -112 },
          away: { line: 6.5, odds: -108 }
        },
        total: {
          over: { line: 229.5, odds: -110 },
          under: { line: 229.5, odds: -110 }
        },
        moneyline: {
          home: -258,
          away: 210
        }
      },
      predictions: []
    }];
  } else {
    return [{
      id: 'NYY-DET-20250407',
      sport: 'MLB',
      homeTeamId: 'DET',
      awayTeamId: 'NYY',
      homeTeamName: 'Detroit Tigers',
      awayTeamName: 'New York Yankees',
      gameDate: '2025-04-07',
      startTime: '2025-04-07T19:10:00Z',
      status: 'scheduled',
      odds: {
        spread: {
          home: { line: 1.5, odds: -115 },
          away: { line: -1.5, odds: -105 }
        },
        total: {
          over: { line: 8.5, odds: -110 },
          under: { line: 8.5, odds: -110 }
        },
        moneyline: {
          home: 125,
          away: -145
        }
      },
      predictions: []
    }];
  }
};

export const getMockGameOdds = (gameId: string, sport: SportType): Prediction[] => {
  return [
    {
      id: uuidv4(),
      gameId,
      predictionType: 'SPREAD',
      predictionValue: sport === 'NBA' ? '-6.5' : '+1.5',
      confidence: 0.75,
      reasoning: 'Strong historical performance against spread',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      gameId,
      predictionType: 'MONEYLINE',
      predictionValue: sport === 'NBA' ? '-258' : '+125',
      confidence: 0.8,
      reasoning: 'Team has won 7 of last 10 matchups',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      gameId,
      predictionType: 'TOTAL',
      predictionValue: sport === 'NBA' ? '229.5' : '8.5',
      confidence: 0.7,
      reasoning: sport === 'NBA' ? 'Teams average over 110 points per game' : 'Strong pitching matchup expected',
      createdAt: new Date().toISOString()
    }
  ];
};

export const getMockPlayerProps = (game: Game): PlayerProp[] => {
  const isNBA = game.sport === 'NBA';
  return [
    {
      id: uuidv4(),
      gameId: game.id,
      playerName: isNBA ? 'LeBron James' : 'Aaron Judge',
      propType: isNBA ? 'POINTS' : 'HITS',
      line: isNBA ? 27.5 : 1.5,
      prediction: isNBA ? 30.5 : 2.0,
      confidence: 0.75,
      reasoning: isNBA ? 'Player averaging 30+ points in last 5 games' : 'Player has hit safely in 8 of last 10 games',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      gameId: game.id,
      playerName: isNBA ? 'Jayson Tatum' : 'Rafael Devers',
      propType: isNBA ? 'REBOUNDS' : 'RUNS',
      line: isNBA ? 8.5 : 0.5,
      prediction: isNBA ? 10.0 : 1.0,
      confidence: 0.65,
      reasoning: isNBA ? 'Player averaging 7 rebounds in last 5 games' : 'Player has scored in 6 of last 10 games',
      createdAt: new Date().toISOString()
    }
  ];
};

// Mock data
const nbaTeams = [
  'Los Angeles Lakers',
  'Boston Celtics',
  'Golden State Warriors',
  'Miami Heat',
  'Milwaukee Bucks'
];

const mlbTeams = [
  'New York Yankees',
  'Los Angeles Dodgers',
  'Boston Red Sox',
  'Chicago Cubs',
  'Houston Astros'
];

const nbaPlayers = [
  'LeBron James',
  'Stephen Curry',
  'Giannis Antetokounmpo',
  'Jayson Tatum',
  'Jimmy Butler'
];

const mlbPlayers = [
  'Shohei Ohtani',
  'Aaron Judge',
  'Mookie Betts',
  'Ronald Acuña Jr.',
  'Juan Soto'
]; 