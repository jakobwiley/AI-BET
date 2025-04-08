import React from 'react';
import { render, screen } from '@testing-library/react';
import GameCard from '@/components/GameCard';
import { Game, Prediction } from '@/models/types';

describe('GameCard', () => {
  const mockGame: Game = {
    id: 'test-game-123',
    sport: 'NBA',
    homeTeamId: 'lakers',
    awayTeamId: 'celtics',
    homeTeamName: 'Lakers',
    awayTeamName: 'Celtics',
    gameDate: '2024-03-20T00:00:00Z',
    startTime: '2024-03-20T00:00:00Z',
    status: 'SCHEDULED',
    spread: { home: -5.5, away: 5.5 }
  };

  const mockPredictions: Prediction[] = [
    {
      id: 'pred-1',
      gameId: 'test-game-123',
      predictionType: 'SPREAD',
      predictionValue: '-5.5',
      confidence: 75,
      reasoning: 'Strong home team performance',
      createdAt: '2024-03-20T00:00:00Z'
    },
    {
      id: 'pred-2',
      gameId: 'test-game-123',
      predictionType: 'MONEYLINE',
      predictionValue: 'Lakers',
      confidence: 65,
      reasoning: 'Home court advantage',
      createdAt: '2024-03-20T00:00:00Z'
    }
  ];

  it('renders game information correctly', () => {
    render(<GameCard game={mockGame} predictions={[]} />);
    
    expect(screen.getByTestId('game-teams')).toHaveTextContent('Lakers vs Celtics');
    expect(screen.getByTestId('home-team')).toHaveTextContent('Lakers');
    expect(screen.getByTestId('away-team')).toHaveTextContent('Celtics');
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Away')).toBeInTheDocument();
    expect(screen.getByTestId('spread-value')).toHaveTextContent('-5.5');
    expect(screen.getByText('Mar 20, 12:00 AM')).toBeInTheDocument();
  });

  it('displays the highest confidence prediction', () => {
    render(<GameCard game={mockGame} predictions={mockPredictions} />);

    // The spread prediction has the highest confidence (75%)
    expect(screen.getByText('Top Prediction')).toBeInTheDocument();
    expect(screen.getByTestId('prediction-value')).toHaveTextContent('-5.5');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<GameCard game={null} loading={true} predictions={[]} />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('includes link to game details', () => {
    render(<GameCard game={mockGame} predictions={[]} />);
    const link = screen.getByText('View All Predictions');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/games/test-game-123');
  });
}); 