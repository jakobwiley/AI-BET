import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameDetails from '@/components/GameDetails';
import { Game, Prediction, PlayerProp } from '@/models/types';

// Mock the useSportsData hook
jest.mock('@/hooks/useSportsData', () => ({
  useSportsData: () => ({
    predictions: [],
    loading: false,
    error: null
  })
}));

describe('GameDetails', () => {
  const mockGame: Game = {
    id: 'game-1',
    sport: 'NBA',
    homeTeamId: 'lakers',
    awayTeamId: 'celtics',
    homeTeamName: 'Lakers',
    awayTeamName: 'Celtics',
    gameDate: '2024-03-19T19:00:00Z',
    status: 'Scheduled',
    spread: { home: -5.5, away: 5.5 }
  };

  const mockPredictions: Prediction[] = [
    {
      id: 'pred-1',
      gameId: 'game-1',
      predictionType: 'SPREAD',
      predictionValue: '-5.5',
      confidence: 75,
      reasoning: 'Lakers are favored',
      createdAt: '2024-03-19T00:00:00Z'
    },
    {
      id: 'pred-2',
      gameId: 'game-1',
      predictionType: 'TOTAL',
      predictionValue: 'O/U 220.5',
      confidence: 70,
      reasoning: 'High scoring expected',
      createdAt: '2024-03-19T00:00:00Z'
    }
  ];

  const mockPlayerProps: PlayerProp[] = [
    {
      id: 'prop-1',
      gameId: 'game-1',
      playerId: 'lebron',
      playerName: 'LeBron James',
      propType: 'POINTS',
      line: 25.5,
      prediction: 28,
      confidence: 80,
      reasoning: 'Recent hot streak',
      createdAt: '2024-03-19T00:00:00Z'
    }
  ];

  it('renders game header information', () => {
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={[]} 
      />
    );

    expect(screen.getByText('Celtics vs Lakers')).toBeInTheDocument();
    expect(screen.getByText(/Scheduled/)).toBeInTheDocument();
  });

  it('displays predictions tab content', () => {
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={mockPredictions} 
        initialPlayerProps={[]} 
      />
    );

    expect(screen.getByText('Game Predictions')).toBeInTheDocument();
    expect(screen.getByText('-5.5')).toBeInTheDocument();
    expect(screen.getByText('O/U O/U 220.5')).toBeInTheDocument();
    expect(screen.getByText('7500%')).toBeInTheDocument();
    expect(screen.getByText('7000%')).toBeInTheDocument();
  });

  it('switches to player props tab', () => {
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={mockPlayerProps} 
      />
    );

    const playerPropsButton = screen.getByText('Player Props');
    fireEvent.click(playerPropsButton);

    expect(screen.getByText('LeBron James')).toBeInTheDocument();
    expect(screen.getByText('25.5')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('8000%')).toBeInTheDocument();
  });

  it('shows team logos', () => {
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={[]} 
      />
    );

    const lakersLogo = screen.getByAltText('Lakers logo');
    const celticsLogo = screen.getByAltText('Celtics logo');

    expect(lakersLogo).toBeInTheDocument();
    expect(celticsLogo).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={[]} 
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading predictions...')).toBeInTheDocument();
  });

  it('handles empty predictions and player props', () => {
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={[]} 
      />
    );

    expect(screen.getByText('No predictions available for this game yet.')).toBeInTheDocument();
  });

  it('shows game stats based on sport type', () => {
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={[]} 
      />
    );

    expect(screen.getByText('Game Stats')).toBeInTheDocument();
    expect(screen.getByText('Celtics Key Stats')).toBeInTheDocument();
    expect(screen.getByText('Lakers Key Stats')).toBeInTheDocument();
  });
}); 