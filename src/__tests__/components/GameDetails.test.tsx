import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameDetails from '@/components/GameDetails';
import { Game, Prediction, PlayerProp } from '@/models/types';

jest.mock('@/hooks/useSportsData', () => ({
  useGamePredictions: () => ({
    predictions: [],
    loading: false,
    error: null,
    refresh: jest.fn()
  })
}));

describe('GameDetails', () => {
  const mockGame: Game = {
    id: 'test-game-123',
    sport: 'NBA',
    homeTeamId: 'lakers',
    awayTeamId: 'celtics',
    homeTeamName: 'Lakers',
    awayTeamName: 'Celtics',
    gameDate: '2024-03-20T00:00:00Z',
    status: 'Scheduled',
    spread: { home: -5.5, away: 5.5 }
  };

  const mockPredictions: Prediction[] = [
    {
      id: 'pred-1',
      gameId: 'test-game-123',
      predictionType: 'SPREAD',
      predictionValue: '-5.5',
      confidence: 75,
      reasoning: 'Lakers are favored',
      createdAt: '2024-03-20T00:00:00Z'
    },
    {
      id: 'pred-2',
      gameId: 'test-game-123',
      predictionType: 'TOTAL',
      predictionValue: 'O/U 220.5',
      confidence: 70,
      reasoning: 'High scoring game expected',
      createdAt: '2024-03-20T00:00:00Z'
    }
  ];

  const mockPlayerProps: PlayerProp[] = [
    {
      id: 'prop-1',
      gameId: 'test-game-123',
      playerName: 'LeBron James',
      propType: 'POINTS',
      overUnderValue: 25.5,
      predictionValue: 'OVER',
      confidence: 80,
      createdAt: '2024-03-20T00:00:00Z'
    }
  ];

  it('renders game header information correctly', () => {
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={mockPredictions}
        initialPlayerProps={mockPlayerProps}
      />
    );
    
    expect(screen.getByText('Lakers vs Celtics')).toBeInTheDocument();
    expect(screen.getByText(/Scheduled/)).toBeInTheDocument();
  });

  it('displays predictions tab content', () => {
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={mockPredictions}
        initialPlayerProps={mockPlayerProps}
      />
    );
    
    // Should show predictions by default
    expect(screen.getByText('Game Predictions')).toBeInTheDocument();
    expect(screen.getByText('-5.5')).toBeInTheDocument();
    expect(screen.getByText('O/U 220.5')).toBeInTheDocument();
  });

  it('switches to player props tab', () => {
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={mockPredictions}
        initialPlayerProps={mockPlayerProps}
      />
    );
    
    // Click player props tab
    fireEvent.click(screen.getByText('Player Props'));
    
    expect(screen.getByText('LeBron James')).toBeInTheDocument();
    expect(screen.getByText('25.5')).toBeInTheDocument();
    expect(screen.getByText('OVER')).toBeInTheDocument();
  });

  it('displays team logos', () => {
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={mockPredictions}
        initialPlayerProps={mockPlayerProps}
      />
    );
    
    const logos = screen.getAllByRole('img');
    expect(logos).toHaveLength(2); // Home and away team logos
    expect(logos[0]).toHaveAttribute('alt', 'Celtics logo');
    expect(logos[1]).toHaveAttribute('alt', 'Lakers logo');
  });

  it('shows loading state when fetching data', () => {
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [true, jest.fn()]);
    
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={[]}
        initialPlayerProps={[]}
      />
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles empty predictions gracefully', () => {
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={[]}
        initialPlayerProps={[]}
      />
    );
    
    expect(screen.getByText('No predictions available for this game yet.')).toBeInTheDocument();
  });

  it('handles empty player props gracefully', () => {
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={mockPredictions}
        initialPlayerProps={[]}
      />
    );
    
    fireEvent.click(screen.getByText('Player Props'));
    expect(screen.getByText('No player props available for this game yet.')).toBeInTheDocument();
  });

  it('displays game stats section based on sport type', () => {
    render(
      <GameDetails 
        game={mockGame}
        initialPredictions={mockPredictions}
        initialPlayerProps={mockPlayerProps}
      />
    );
    
    expect(screen.getByText('Game Stats')).toBeInTheDocument();
    expect(screen.getByText('Lakers Key Stats')).toBeInTheDocument();
    expect(screen.getByText('Celtics Key Stats')).toBeInTheDocument();
  });
}); 