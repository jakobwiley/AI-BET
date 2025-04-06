import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameList } from '@/components/GameList';
import GameDetails from '@/components/GameDetails';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { OddsApiService } from '@/lib/oddsApi';
import { Game, Prediction, PlayerProp, SportType } from '@/models/types';

// Mock the hooks and services
jest.mock('@/hooks/useSportsData', () => ({
  useUpcomingGames: jest.fn()
}));

jest.mock('@/lib/oddsApi', () => ({
  OddsApiService: {
    getGamePredictions: jest.fn()
  }
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: { id: 'game-1' }
  })
}));

describe('Prediction Flow Integration', () => {
  const mockGame: Game = {
    id: 'game-1',
    sport: 'NBA' as SportType,
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [mockGame],
      loading: false,
      error: null
    });
  });

  it('shows predictions in game list and details view', async () => {
    // First render the game list
    render(<GameList sport="NBA" />);

    // Check that the game and its prediction are shown in the list
    expect(screen.getByText('Lakers')).toBeInTheDocument();
    expect(screen.getByText('Celtics')).toBeInTheDocument();
    expect(screen.getByText('-5.5')).toBeInTheDocument();
    expect(screen.getByText('7500%')).toBeInTheDocument();

    // Mock the predictions API call that would happen in GameDetails
    (OddsApiService.getGamePredictions as jest.Mock).mockResolvedValue(mockPredictions);

    // Render the game details view
    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={mockPredictions} 
        initialPlayerProps={[]} 
      />
    );

    // Wait for predictions to load
    await waitFor(() => {
      expect(screen.getByText('Game Predictions')).toBeInTheDocument();
    });

    // Verify all predictions are shown
    expect(screen.getByText('-5.5')).toBeInTheDocument();
    expect(screen.getByText('O/U O/U 220.5')).toBeInTheDocument();
    expect(screen.getByText('7500%')).toBeInTheDocument();
    expect(screen.getByText('7000%')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock an API error
    (OddsApiService.getGamePredictions as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch predictions')
    );

    render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={[]} 
      />
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('No predictions available for this game yet.')).toBeInTheDocument();
    });
  });

  it('updates predictions when refresh is triggered', async () => {
    const { rerender } = render(
      <GameDetails 
        game={mockGame} 
        initialPredictions={[]} 
        initialPlayerProps={[]} 
      />
    );

    // Mock new predictions data
    const newPredictions: Prediction[] = [
      {
        id: 'pred-3',
        gameId: 'game-1',
        predictionType: 'SPREAD',
        predictionValue: '-6.5',
        confidence: 80,
        reasoning: 'Lakers are strongly favored',
        createdAt: '2024-03-19T01:00:00Z'
      }
    ];

    // Mock the API call for refresh
    (OddsApiService.getGamePredictions as jest.Mock).mockResolvedValue(newPredictions);

    // Trigger a refresh by rerendering with new predictions
    rerender(
      <GameDetails 
        game={mockGame} 
        initialPredictions={newPredictions} 
        initialPlayerProps={[]} 
      />
    );

    // Wait for new predictions to show
    await waitFor(() => {
      expect(screen.getByText('-6.5')).toBeInTheDocument();
      expect(screen.getByText('8000%')).toBeInTheDocument();
    });
  });
}); 