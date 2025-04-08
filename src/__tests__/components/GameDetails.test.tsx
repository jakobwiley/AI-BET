import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameDetails from '@/components/GameDetails';
import { Game, Prediction } from '@/models/types';

// Mock the useSportsData hook
jest.mock('@/hooks/useSportsData', () => ({
  useSportsData: () => ({
    predictions: [],
    loading: false,
    error: null
  })
}));

const mockGame: Game = {
  id: '1',
  sport: 'NBA',
  homeTeamId: 'LAL',
  homeTeamName: 'Lakers',
  awayTeamId: 'BOS',
  awayTeamName: 'Celtics',
  gameDate: '2024-03-20',
  startTime: '19:30',
  status: 'Scheduled',
  odds: {
    spread: {
      home: { line: -2.5, odds: -110 },
      away: { line: 2.5, odds: -110 }
    },
    total: {
      over: { line: 220.5, odds: -110 },
      under: { line: 220.5, odds: -110 }
    },
    moneyline: {
      home: -110,
      away: -110
    }
  }
};

const mockPredictions: Prediction[] = [
  {
    id: '1',
    gameId: '1',
    predictionType: 'SPREAD',
    predictionValue: 'Lakers -2.5',
    confidence: 75,
    reasoning: 'Lakers have been strong at home',
    createdAt: '2024-03-20T00:00:00Z'
  }
];

describe('GameDetails', () => {
  it('renders loading state', () => {
    render(<GameDetails game={mockGame} isLoading={true} />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders predictions tab by default', () => {
    render(<GameDetails game={mockGame} initialPredictions={mockPredictions} />);
    expect(screen.getByText('Lakers vs Celtics')).toBeInTheDocument();
    expect(screen.getByText('Lakers -2.5')).toBeInTheDocument();
  });

  it('switches to stats tab', () => {
    render(<GameDetails game={mockGame} initialPredictions={mockPredictions} />);
    fireEvent.click(screen.getByText('Stats'));
    expect(screen.getByText('Lakers Key Stats')).toBeInTheDocument();
    expect(screen.getByText('Points Per Game: 112.5')).toBeInTheDocument();
  });

  it('shows MLB stats when game is baseball', () => {
    const baseballGame: Game = {
      ...mockGame,
      sport: 'MLB',
      homeTeamId: 'NYY',
      homeTeamName: 'Yankees',
      awayTeamId: 'BOS',
      awayTeamName: 'Red Sox'
    };
    render(<GameDetails game={baseballGame} initialPredictions={[]} />);
    fireEvent.click(screen.getByText('Stats'));
    expect(screen.getByText('Yankees Key Stats')).toBeInTheDocument();
    expect(screen.getByText('Batting Average: .275')).toBeInTheDocument();
  });
}); 