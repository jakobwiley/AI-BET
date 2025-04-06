import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameList } from '@/components/GameList';
import GameDetails from '@/components/GameDetails';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { OddsApiService } from '@/lib/oddsApi';

// Mock the hooks and services
jest.mock('@/hooks/useSportsData');
jest.mock('@/lib/oddsApi');

describe('Prediction Flow Integration', () => {
  const mockGames = [
    {
      id: 'game-1',
      sport: 'NBA',
      homeTeamId: 'lakers',
      awayTeamId: 'celtics',
      homeTeamName: 'Lakers',
      awayTeamName: 'Celtics',
      gameDate: '2024-03-20T00:00:00Z',
      status: 'Scheduled',
      spread: { home: -5.5, away: 5.5 },
      predictions: [
        {
          id: 'pred-1',
          gameId: 'game-1',
          predictionType: 'SPREAD',
          predictionValue: '-5.5',
          confidence: 75,
          reasoning: 'Lakers are favored',
          createdAt: '2024-03-20T00:00:00Z'
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: mockGames,
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
    expect(screen.getByText('75%')).toBeInTheDocument();

    // Click to view game details
    const detailsLink = screen.getByText('View All Predictions');
    fireEvent.click(detailsLink);

    // Mock the predictions API call that would happen in GameDetails
    (OddsApiService.getGamePredictions as jest.Mock).mockResolvedValue([
      {
        id: 'pred-1',
        gameId: 'game-1',
        predictionType: 'SPREAD',
        predictionValue: '-5.5',
        confidence: 75,
        reasoning: 'Lakers are favored',
        createdAt: '2024-03-20T00:00:00Z'
      },
      {
        id: 'pred-2',
        gameId: 'game-1',
        predictionType: 'TOTAL',
        predictionValue: 'O/U 220.5',
        confidence: 70,
        reasoning: 'High scoring expected',
        createdAt: '2024-03-20T00:00:00Z'
      }
    ]);

    // Render the game details view
    render(<GameDetails game={mockGames[0]} initialPredictions={[]} initialPlayerProps={[]} />);

    // Wait for predictions to load
    await waitFor(() => {
      expect(screen.getByText('Game Predictions')).toBeInTheDocument();
    });

    // Verify all predictions are shown
    expect(screen.getByText('-5.5')).toBeInTheDocument();
    expect(screen.getByText('O/U 220.5')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock an API error
    (OddsApiService.getGamePredictions as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch predictions')
    );

    render(<GameDetails game={mockGames[0]} initialPredictions={[]} initialPlayerProps={[]} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('No predictions available for this game yet.')).toBeInTheDocument();
    });
  });

  it('updates predictions when refresh is triggered', async () => {
    const { rerender } = render(
      <GameDetails game={mockGames[0]} initialPredictions={[]} initialPlayerProps={[]} />
    );

    // Mock new predictions data
    const newPredictions = [
      {
        id: 'pred-3',
        gameId: 'game-1',
        predictionType: 'SPREAD',
        predictionValue: '-6.5',
        confidence: 80,
        reasoning: 'Lakers are strongly favored',
        createdAt: '2024-03-20T01:00:00Z'
      }
    ];

    // Mock the API call for refresh
    (OddsApiService.getGamePredictions as jest.Mock).mockResolvedValue(newPredictions);

    // Trigger a refresh (this would normally happen via a refresh button or interval)
    rerender(
      <GameDetails 
        game={mockGames[0]} 
        initialPredictions={newPredictions} 
        initialPlayerProps={[]} 
      />
    );

    // Wait for new predictions to show
    await waitFor(() => {
      expect(screen.getByText('-6.5')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });
}); 