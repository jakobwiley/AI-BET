import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GameList from '@/components/GameList';
import GameDetails from '@/components/GameDetails';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { Game, Prediction, SportType } from '@/models/types';
import { getMockGames, getMockGameOdds } from '@/lib/testUtils';

// Mock the hooks
jest.mock('@/hooks/useSportsData', () => ({
  useUpcomingGames: jest.fn()
}));

describe('Game Components Integration', () => {
  const mockNBAGames = getMockGames('NBA');
  const mockMLBGames = getMockGames('MLB');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GameList Component', () => {
    it('renders NBA games correctly', async () => {
      (useUpcomingGames as jest.Mock).mockReturnValue({
        games: mockNBAGames,
        loading: false,
        error: null
      });

      render(<GameList sport="NBA" />);

      await waitFor(() => {
        expect(screen.getByText('Detroit Pistons vs Sacramento Kings')).toBeInTheDocument();
        expect(screen.getByText('-6.5')).toBeInTheDocument();
        expect(screen.getByText('O/U 229.5')).toBeInTheDocument();
      });
    });

    it('renders MLB games correctly', async () => {
      (useUpcomingGames as jest.Mock).mockReturnValue({
        games: mockMLBGames,
        loading: false,
        error: null
      });

      render(<GameList sport="MLB" />);

      await waitFor(() => {
        expect(screen.getByText('Detroit Tigers vs New York Yankees')).toBeInTheDocument();
        expect(screen.getByText('1.5')).toBeInTheDocument();
        expect(screen.getByText('O/U 8.5')).toBeInTheDocument();
      });
    });

    it('handles loading state', () => {
      (useUpcomingGames as jest.Mock).mockReturnValue({
        games: [],
        loading: true,
        error: null
      });

      render(<GameList sport="NBA" />);
      expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(6);
    });

    it('handles error state', () => {
      const errorMessage = 'Failed to load games';
      (useUpcomingGames as jest.Mock).mockReturnValue({
        games: [],
        loading: false,
        error: new Error(errorMessage)
      });

      render(<GameList sport="NBA" />);
      expect(screen.getByText(`Error loading games: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  describe('GameDetails Component', () => {
    const mockGame = mockNBAGames[0];
    const mockPredictions = getMockGameOdds(mockGame.id, 'NBA');

    it('renders game details correctly', () => {
      render(
        <GameDetails 
          game={mockGame}
          initialPredictions={mockPredictions}
          isLoading={false}
        />
      );

      expect(screen.getByText('Detroit Pistons vs Sacramento Kings')).toBeInTheDocument();
      expect(screen.getByText('-6.5')).toBeInTheDocument();
      expect(screen.getByText('O/U 229.5')).toBeInTheDocument();
      expect(screen.getByText('-258')).toBeInTheDocument();
    });

    it('handles game not found', () => {
      render(
        <GameDetails 
          game={undefined}
          initialPredictions={[]}
          isLoading={false}
        />
      );
      expect(screen.getByText('Game not found')).toBeInTheDocument();
    });
  });
}); 