import { render, screen, waitFor } from '@testing-library/react';
import GameList from '@/components/GameList';
import { useUpcomingGames } from '@/hooks/useSportsData';

// Mock the useUpcomingGames hook
jest.mock('@/hooks/useSportsData');

describe('GameList Component', () => {
  const mockGames = [
    {
      id: '1',
      sport: 'NBA' as const,
      gameDate: new Date(),
      homeTeamId: '1',
      awayTeamId: '2',
      homeTeamName: 'Lakers',
      awayTeamName: 'Warriors',
      status: 'SCHEDULED' as const,
      predictions: [],
      playerProps: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: true,
      error: null
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('Loading games...')).toBeInTheDocument();
  });

  it('should render games when loaded', async () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: mockGames,
      loading: false,
      error: null
    });

    render(<GameList sport="NBA" />);

    await waitFor(() => {
      expect(screen.getByText('Lakers vs Warriors')).toBeInTheDocument();
    });
  });

  it('should render error state when there is an error', () => {
    const error = new Error('Failed to fetch games');
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: false,
      error
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('Error loading games')).toBeInTheDocument();
  });

  it('should render empty state when no games are available', () => {
    (useUpcomingGames as jest.Mock).mockReturnValue({
      games: [],
      loading: false,
      error: null
    });

    render(<GameList sport="NBA" />);

    expect(screen.getByText('No upcoming games found')).toBeInTheDocument();
  });
}); 