import { SportType } from '@/models/types';

export interface GameOdds {
  id: string;
  sportType: SportType;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  spread: {
    home: { line: number; odds: number };
    away: { line: number; odds: number };
  };
  total: {
    over: { line: number; odds: number };
    under: { line: number; odds: number };
  };
  moneyline: {
    home: number;
    away: number;
  };
}

// Current games from DraftKings (April 7th, 2025)
export const CURRENT_GAMES: GameOdds[] = [
  // NBA Games
  {
    id: 'SAC-DET-20250407',
    sportType: 'NBA',
    homeTeam: 'Detroit Pistons',
    awayTeam: 'Sacramento Kings',
    startTime: '2025-04-07T23:10:00Z',
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
  {
    id: 'PHI-MIA-20250407',
    sportType: 'NBA',
    homeTeam: 'Miami Heat',
    awayTeam: 'Philadelphia 76ers',
    startTime: '2025-04-07T23:40:00Z',
    spread: {
      home: { line: -13, odds: -112 },
      away: { line: 13, odds: -108 }
    },
    total: {
      over: { line: 213, odds: -112 },
      under: { line: 213, odds: -108 }
    },
    moneyline: {
      home: -800,
      away: 550
    }
  },
  {
    id: 'ATL-ORL-20250408',
    sportType: 'NBA',
    homeTeam: 'Orlando Magic',
    awayTeam: 'Atlanta Hawks',
    startTime: '2025-04-08T23:10:00Z',
    spread: {
      home: { line: -4.5, odds: -110 },
      away: { line: 4.5, odds: -110 }
    },
    total: {
      over: { line: 225, odds: -110 },
      under: { line: 225, odds: -110 }
    },
    moneyline: {
      home: -192,
      away: 160
    }
  },
  {
    id: 'BOS-NYK-20250408',
    sportType: 'NBA',
    homeTeam: 'New York Knicks',
    awayTeam: 'Boston Celtics',
    startTime: '2025-04-08T23:30:00Z',
    spread: {
      home: { line: 3.5, odds: -110 },
      away: { line: -3.5, odds: -110 }
    },
    total: {
      over: { line: 223, odds: -110 },
      under: { line: 223, odds: -110 }
    },
    moneyline: {
      home: 136,
      away: -162
    }
  },
  // MLB Games
  {
    id: 'NYY-DET-20250407',
    sportType: 'MLB',
    homeTeam: 'Detroit Tigers',
    awayTeam: 'New York Yankees',
    startTime: '2025-04-07T19:10:00Z',
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
  {
    id: 'STL-PIT-20250407',
    sportType: 'MLB',
    homeTeam: 'Pittsburgh Pirates',
    awayTeam: 'St. Louis Cardinals',
    startTime: '2025-04-07T22:40:00Z',
    spread: {
      home: { line: 1.5, odds: -120 },
      away: { line: -1.5, odds: 100 }
    },
    total: {
      over: { line: 9, odds: -105 },
      under: { line: 9, odds: -115 }
    },
    moneyline: {
      home: 115,
      away: -135
    }
  },
  {
    id: 'TOR-BOS-20250407',
    sportType: 'MLB',
    homeTeam: 'Boston Red Sox',
    awayTeam: 'Toronto Blue Jays',
    startTime: '2025-04-07T22:45:00Z',
    spread: {
      home: { line: -1.5, odds: 105 },
      away: { line: 1.5, odds: -125 }
    },
    total: {
      over: { line: 9.5, odds: -110 },
      under: { line: 9.5, odds: -110 }
    },
    moneyline: {
      home: -130,
      away: 110
    }
  },
  {
    id: 'LAD-WSH-20250407',
    sportType: 'MLB',
    homeTeam: 'Washington Nationals',
    awayTeam: 'Los Angeles Dodgers',
    startTime: '2025-04-07T22:45:00Z',
    spread: {
      home: { line: 2.5, odds: -110 },
      away: { line: -2.5, odds: -110 }
    },
    total: {
      over: { line: 8.5, odds: -115 },
      under: { line: 8.5, odds: -105 }
    },
    moneyline: {
      home: 180,
      away: -220
    }
  }
];

export function getUpcomingGames(sport: SportType): GameOdds[] {
  return CURRENT_GAMES.filter(game => game.sportType === sport);
}

export function getGameById(id: string): GameOdds | undefined {
  return CURRENT_GAMES.find(game => game.id === id);
} 