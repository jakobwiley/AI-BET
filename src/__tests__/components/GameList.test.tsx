import React from 'react';
import { render, screen } from '@testing-library/react';
import GameList from '@/components/GameList';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { Game } from '@/models/types';

// Mock the useUpcomingGames hook
jest.mock('@/hooks/useSportsData', () => ({
  useUpcomingGames: jest.fn()
}));

describe('GameList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: true,
      error: null
    });

    render(<GameList sport="NBA" />);

    const skeletons = screen.getAllByTestId('loading-skeleton');
    expect(skeletons).toHaveLength(6);
  });

  it('should render games when data is loaded', () => {
    const mockGames = [
      {
        id: 'game-1',
        sport: 'NBA' as const,
        homeTeamId: 'lakers',
        awayTeamId: 'celtics',
        homeTeamName: 'Lakers',
        awayTeamName: 'Celtics',
        gameDate: '2024-03-19T19:00:00Z',
        startTime: '19:00:00',
        status: 'SCHEDULED',
        spread: -5.5,
        total: 220.5,
        predictions: []
      }
    ];

    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: mockGames,
      loading: false,
      error: null
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('Lakers vs Celtics')).toBeInTheDocument();
  });

  it('should show error message when there is an error', () => {
    const errorMessage = 'Failed to load games';
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: false,
      error: new Error(errorMessage)
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText(`Error loading games: ${errorMessage}`)).toBeInTheDocument();
  });

  it('should show empty state when no games are available', () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: false,
      error: null
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('No upcoming games')).toBeInTheDocument();
  });
}); 