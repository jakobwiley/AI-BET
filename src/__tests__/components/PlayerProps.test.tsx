import { render, screen } from '@testing-library/react';
import PlayerProps from '@/components/PlayerProps';
import { usePlayerProps } from '@/hooks/useSportsData';

// Mock the usePlayerProps hook
jest.mock('@/hooks/useSportsData');

describe('PlayerProps Component', () => {
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
      game: {
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
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [],
      loading: true,
      error: null
    });

    render(<PlayerProps gameId="game-1" sport="NBA" />);

    expect(screen.getByText('Loading player props...')).toBeInTheDocument();
  });

  it('should render player props when loaded', () => {
    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: mockPlayerProps,
      loading: false,
      error: null
    });

    render(<PlayerProps gameId="game-1" sport="NBA" />);

    expect(screen.getByText('LeBron James')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
    
    // Test for the combined text content instead of individual parts
    const propValueText = screen.getByText((content, element) => {
      return content.includes('OVER') && content.includes('24.5');
    });
    expect(propValueText).toBeInTheDocument();
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Test reasoning')).toBeInTheDocument();
  });

  it('should render error state when there is an error', () => {
    const error = new Error('Failed to fetch player props');
    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [],
      loading: false,
      error
    });

    render(<PlayerProps gameId="game-1" sport="NBA" />);

    expect(screen.getByText('Error loading player props')).toBeInTheDocument();
  });

  it('should render empty state when no player props are available', () => {
    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [],
      loading: false,
      error: null
    });

    render(<PlayerProps gameId="game-1" sport="NBA" />);

    expect(screen.getByText('No player props available')).toBeInTheDocument();
  });

  it('should render different prop types correctly', () => {
    const reboundsProp = {
      ...mockPlayerProps[0],
      propType: 'REBOUNDS',
      overUnderValue: 8.5,
      predictionValue: 'UNDER'
    };

    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [reboundsProp],
      loading: false,
      error: null
    });

    render(<PlayerProps gameId="game-1" sport="NBA" />);

    expect(screen.getByText('Rebounds')).toBeInTheDocument();
    
    // Test for the combined text content instead of individual parts
    const propValueText = screen.getByText((content, element) => {
      return content.includes('UNDER') && content.includes('8.5');
    });
    expect(propValueText).toBeInTheDocument();
  });

  it('should render confidence level with correct color', () => {
    const highConfidenceProp = {
      ...mockPlayerProps[0],
      confidence: 0.85
    };

    (usePlayerProps as jest.Mock).mockReturnValue({
      playerProps: [highConfidenceProp],
      loading: false,
      error: null
    });

    render(<PlayerProps gameId="game-1" sport="NBA" />);

    const confidenceElement = screen.getByText('85%');
    expect(confidenceElement).toHaveClass('text-green-500');
  });
}); 