import { renderHook, act } from '@testing-library/react';
import { useUpcomingGames, useGamePredictions } from '@/hooks/useSportsData';
import { SportsApiService } from '@/lib/sportsApi';

jest.mock('@/lib/sportsApi');

describe('useUpcomingGames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return games', async () => {
    const mockGames = [
      {
        id: 'game-1',
        sport: 'NBA',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeTeamName: 'Team 1',
        awayTeamName: 'Team 2',
        gameDate: '2024-04-07',
        startTime: '2024-04-07T19:00:00Z',
        status: 'SCHEDULED',
        predictions: [],
        odds: {
          spread: {
            home: { line: -5.5, odds: -110 },
            away: { line: 5.5, odds: -110 }
          },
          total: {
            over: { line: 220.5, odds: -110 },
            under: { line: 220.5, odds: -110 }
          },
          moneyline: {
            home: -180,
            away: 160
          }
        }
      }
    ];

    (SportsApiService.getUpcomingGames as jest.Mock).mockResolvedValue(mockGames);

    const { result } = renderHook(() => useUpcomingGames('NBA'));

    expect(result.current.loading).toBe(true);
    expect(result.current.games).toEqual([]);
    expect(result.current.error).toBe(null);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.games).toEqual(mockGames);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch games');
    (SportsApiService.getUpcomingGames as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useUpcomingGames('NBA'));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.games).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});

describe('useGamePredictions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return game predictions', async () => {
    const mockGame = {
      id: 'game-1',
      sport: 'NBA',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      homeTeamName: 'Team 1',
      awayTeamName: 'Team 2',
      gameDate: '2024-04-07',
      startTime: '2024-04-07T19:00:00Z',
      status: 'SCHEDULED',
      predictions: [],
      odds: {
        spread: {
          home: { line: -5.5, odds: -110 },
          away: { line: 5.5, odds: -110 }
        },
        total: {
          over: { line: 220.5, odds: -110 },
          under: { line: 220.5, odds: -110 }
        },
        moneyline: {
          home: -180,
          away: 160
        }
      }
    };

    (SportsApiService.getPredictionsForGame as jest.Mock).mockResolvedValue({ game: mockGame });

    const { result } = renderHook(() => useGamePredictions('game-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.game).toBe(null);
    expect(result.current.error).toBe(null);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.game).toEqual(mockGame);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch predictions');
    (SportsApiService.getPredictionsForGame as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useGamePredictions('game-1'));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.game).toBe(null);
    expect(result.current.error).toBeTruthy();
  });
}); 