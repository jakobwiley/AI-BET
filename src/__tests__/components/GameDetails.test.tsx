import { render, screen } from '@testing-library/react';
import GameDetails from '@/components/GameDetails';
import { useGamePredictions, usePlayerProps } from '@/hooks/useSportsData';

// Mock the hooks
jest.mock('@/hooks/useSportsData');

describe('GameDetails Component', () => {
  const mockGame = {
    id: 'game-1',
    sport: 'NBA' as const,
    gameDate: new Date(),
    homeTeamId: '1',
    awayTeamId: '2',
    homeTeamName: 'Lakers',
    awayTeamName: 'Warriors',
    status: 'SCHEDULED' as const,
    predictions: [],
    playerProps: []
  };

  const mockPredictions = [
    {
      id: '1',
      gameId: 'game-1',
      predictionType: 'SPREAD',
      predictionValue: 'HOME -5.5',
      confidence: 0.75,
      reasoning: 'Test reasoning',
      createdAt: new Date(),
      game: mockGame
    }
  ];

  const mockPlayerProps = [
    {
      id: '1',
      gameId: 'game-1',
      playerId: 'player-1',
      playerName: 'LeBron James',
      teamId: 'team-1',
      propType: 'POINTS',
      overUnderValue: 24.5,
      predictionValue: 'OVER',
      confidence: 0.75,
      reasoning: 'Test reasoning',
      createdAt: new Date(),
      game: mockGame
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render game details correctly', () => {
    (useGamePredictions as jest.Mock).mockReturnValue({
      predictions: mockPredictions,
      loading: false,
      error: null
    });

    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: mockPlayerProps,
      loading: false,
      error: null
    });

    render(<GameDetails game={mockGame} />);

    // Check game header
    expect(screen.getByText('Lakers vs Warriors')).toBeInTheDocument();
    expect(screen.getByText(/NBA/)).toBeInTheDocument();

    // Check predictions section
    expect(screen.getByText('Game Predictions')).toBeInTheDocument();
    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByText('HOME -5.5')).toBeInTheDocument();

    // Check player props section
    expect(screen.getByText('Player Props')).toBeInTheDocument();
    expect(screen.getByText('LeBron James')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
  });

  it('should render loading states', () => {
    (useGamePredictions as jest.Mock).mockReturnValue({
      predictions: [],
      loading: true,
      error: null
    });

    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [],
      loading: true,
      error: null
    });

    render(<GameDetails game={mockGame} />);

    expect(screen.getByText('Loading predictions...')).toBeInTheDocument();
    expect(screen.getByText('Loading player props...')).toBeInTheDocument();
  });

  it('should render error states', () => {
    const error = new Error('Failed to fetch data');
    (useGamePredictions as jest.Mock).mockReturnValue({
      predictions: [],
      loading: false,
      error
    });

    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [],
      loading: false,
      error
    });

    render(<GameDetails game={mockGame} />);

    expect(screen.getByText('Error loading predictions')).toBeInTheDocument();
    expect(screen.getByText('Error loading player props')).toBeInTheDocument();
  });

  it('should render empty states', () => {
    (useGamePredictions as jest.Mock).mockReturnValue({
      predictions: [],
      loading: false,
      error: null
    });

    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [],
      loading: false,
      error: null
    });

    render(<GameDetails game={mockGame} />);

    expect(screen.getByText('No predictions available')).toBeInTheDocument();
    expect(screen.getByText('No player props available')).toBeInTheDocument();
  });

  it('should render different sport types correctly', () => {
    const mlbGame = {
      ...mockGame,
      sport: 'MLB' as const
    };

    (useGamePredictions as jest.Mock).mockReturnValue({
      predictions: mockPredictions,
      loading: false,
      error: null
    });

    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: mockPlayerProps,
      loading: false,
      error: null
    });

    render(<GameDetails game={mlbGame} />);

    expect(screen.getByText(/MLB/)).toBeInTheDocument();
  });
}); 