import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameList } from '@/components/GameList';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { Game } from '@/models/types';

// Mock the useUpcomingGames hook
jest.mock('@/hooks/useSportsData', () => ({
  useUpcomingGames: jest.fn()
}));

describe('GameList Component', () => {
  const mockGame: Game = {
    id: 'game-1',
    sport: 'NBA',
    homeTeamId: 'lakers',
    awayTeamId: 'celtics',
    homeTeamName: 'Lakers',
    awayTeamName: 'Celtics',
    gameDate: '2024-03-19T19:00:00Z',
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
        createdAt: '2024-03-19T00:00:00Z'
      }
    ]
  };

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

    expect(screen.getByText('Loading games...')).toBeInTheDocument();
  });

  it('should render games when data is loaded', () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [mockGame],
      loading: false,
      error: null
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('Lakers')).toBeInTheDocument();
    expect(screen.getByText('Celtics')).toBeInTheDocument();
    expect(screen.getByText('-5.5')).toBeInTheDocument();
    expect(screen.getByText('7500%')).toBeInTheDocument();
  });

  it('should render error state when there is an error', () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: false,
      error: 'Failed to load games'
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('Error loading games')).toBeInTheDocument();
  });

  it('should show empty state when no games are available', () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: false,
      error: null
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('No upcoming games found')).toBeInTheDocument();
  });
}); 