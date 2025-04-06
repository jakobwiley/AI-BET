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
      predictionType: 'MONEYLINE',
      predictionValue: '-180',
      confidence: 65,
      reasoning: 'Lakers are likely to win',
      createdAt: '2024-03-20T00:00:00Z'
    },
    {
      id: 'pred-3',
      gameId: 'test-game-123',
      predictionType: 'TOTAL',
      predictionValue: 'O/U 220.5',
      confidence: 70,
      reasoning: 'High scoring game expected',
      createdAt: '2024-03-20T00:00:00Z'
    }
  ];

  it('renders game information correctly', () => {
    render(<GameCard game={mockGame} predictions={[]} />);
    
    expect(screen.getByText('Lakers')).toBeInTheDocument();
    expect(screen.getByText('Celtics')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Away')).toBeInTheDocument();
  });

  it('displays the highest confidence prediction', () => {
    render(<GameCard game={mockGame} predictions={mockPredictions} />);
    
    // The spread prediction has the highest confidence (75%)
    expect(screen.getByText('Top Prediction')).toBeInTheDocument();
    expect(screen.getByText('-5.5')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows correct confidence indicator color', () => {
    render(<GameCard game={mockGame} predictions={mockPredictions} />);
    
    // 75% confidence should show green indicator
    const indicator = screen.getByTestId('confidence-indicator');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('handles missing predictions gracefully', () => {
    render(<GameCard game={mockGame} predictions={[]} />);
    
    expect(screen.queryByText('Top Prediction')).not.toBeInTheDocument();
  });

  it('formats game date correctly', () => {
    render(<GameCard game={mockGame} predictions={[]} />);
    
    // March 20, 2024 date should be formatted
    expect(screen.getByText(/Mar 20/)).toBeInTheDocument();
  });

  it('includes a link to game details', () => {
    render(<GameCard game={mockGame} predictions={[]} />);
    
    const link = screen.getByText('View All Predictions');
    expect(link).toHaveAttribute('href', '/games/test-game-123');
  });
}); 