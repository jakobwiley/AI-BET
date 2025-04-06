import { renderHook, act } from '@testing-library/react';
import { useUpcomingGames, useGamePredictions, usePlayerProps } from '@/hooks/useSportsData';
import { SportsApiService } from '@/lib/sportsApi';
import { SportType } from '@/models/types';

// Mock the SportsApiService
jest.mock('@/lib/sportsApi');

describe('useSportsData Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useUpcomingGames', () => {
    it('should fetch and return NBA games', async () => {
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

      (SportsApiService.getUpcomingGames as jest.Mock).mockResolvedValueOnce(mockGames);

      const { result } = renderHook(() => useUpcomingGames('NBA'));

      // Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.games).toEqual([]);

      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Final state
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.games).toEqual(mockGames);
    });

    it('should handle errors when fetching games', async () => {
      const error = new Error('Failed to fetch games');
      (SportsApiService.getUpcomingGames as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUpcomingGames('NBA'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(error);
      expect(result.current.games).toEqual([]);
    });
  });

  describe('useGamePredictions', () => {
    it('should fetch and return game predictions', async () => {
      const mockPredictions = [
        {
          id: '1',
          gameId: 'game-1',
          predictionType: 'SPREAD',
          predictionValue: 'HOME -5.5',
          confidence: 0.75,
          reasoning: 'Test reasoning',
          createdAt: new Date(),
          game: {} as any
        }
      ];

      (SportsApiService.getPredictionsForGame as jest.Mock).mockResolvedValueOnce(mockPredictions);

      const { result } = renderHook(() => useGamePredictions('game-1'));

      // Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.predictions).toEqual([]);

      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Final state
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.predictions).toEqual(mockPredictions);
    });

    it('should handle errors when fetching predictions', async () => {
      const error = new Error('Failed to fetch predictions');
      (SportsApiService.getPredictionsForGame as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useGamePredictions('game-1'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(error);
      expect(result.current.predictions).toEqual([]);
    });
  });

  describe('usePlayerProps', () => {
    it('should fetch and return player props for NBA', async () => {
      const mockProps = [
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
          game: {} as any
        }
      ];

      (SportsApiService.getPlayerPropsForGame as jest.Mock).mockResolvedValueOnce(mockProps);

      const { result } = renderHook(() => usePlayerProps('game-1', 'NBA'));

      // Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.playerProps).toEqual([]);

      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Final state
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.playerProps).toEqual(mockProps);
    });

    it('should handle errors when fetching player props', async () => {
      const error = new Error('Failed to fetch player props');
      (SportsApiService.getPlayerPropsForGame as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePlayerProps('game-1', 'NBA'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(error);
      expect(result.current.playerProps).toEqual([]);
    });
  });
}); 