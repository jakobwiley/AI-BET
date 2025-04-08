import axios from 'axios';
import { SportsApiService } from '@/lib/sportsApi';
import { SportType } from '@/models/types';
import { getMockGames, getMockGameOdds, getMockPlayerProps } from '@/lib/testUtils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SportsApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpcomingGames', () => {
    it('should fetch NBA games successfully', async () => {
      const mockGames = getMockGames('NBA');
      const mockResponse = {
        status: 200,
        data: mockGames.map(game => ({
          GameID: game.id,
          DateTime: game.gameDate,
          HomeTeamID: game.homeTeamId,
          AwayTeamID: game.awayTeamId,
          HomeTeam: game.homeTeamName,
          AwayTeam: game.awayTeamName,
          Status: game.status
        }))
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const games = await SportsApiService.getUpcomingGames('NBA' as SportType);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/nba/games',
        expect.objectContaining({
          headers: {
            'x-api-key': expect.any(String)
          }
        })
      );
      expect(games).toHaveLength(mockGames.length);
    });

    it('should fetch MLB games successfully', async () => {
      const mockGames = getMockGames('MLB');
      const mockResponse = {
        status: 200,
        data: mockGames.map(game => ({
          GameID: game.id,
          DateTime: game.gameDate,
          HomeTeamID: game.homeTeamId,
          AwayTeamID: game.awayTeamId,
          HomeTeam: game.homeTeamName,
          AwayTeam: game.awayTeamName,
          Status: game.status
        }))
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const games = await SportsApiService.getUpcomingGames('MLB' as SportType);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/mlb/games',
        expect.objectContaining({
          headers: {
            'x-api-key': expect.any(String)
          }
        })
      );
      expect(games).toHaveLength(mockGames.length);
    });

    it('should return empty array when API fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const games = await SportsApiService.getUpcomingGames('NBA' as SportType);

      expect(games).toEqual([]);
    });
  });

  describe('getPredictionsForGame', () => {
    it('should fetch predictions successfully', async () => {
      const mockPredictions = getMockGameOdds('test-game-id', 'NBA');
      const mockResponse = {
        status: 200,
        data: mockPredictions
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const predictions = await SportsApiService.getPredictionsForGame('test-game-id');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/predictions/test-game-id',
        expect.objectContaining({
          headers: {
            'x-api-key': expect.any(String)
          }
        })
      );
      expect(predictions).toHaveLength(mockPredictions.length);
    });

    it('should return empty array when API fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const predictions = await SportsApiService.getPredictionsForGame('test-game-id');

      expect(predictions).toEqual([]);
    });
  });

  describe('getPlayerPropsForGame', () => {
    it('should fetch player props for NBA successfully', async () => {
      const mockProps = getMockPlayerProps('test-game-id', 'NBA');
      const mockResponse = {
        status: 200,
        data: mockProps
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const props = await SportsApiService.getPlayerPropsForGame('test-game-id', 'NBA');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/player-props/test-game-id',
        expect.objectContaining({
          params: { sport: 'NBA' },
          headers: {
            'x-api-key': expect.any(String)
          }
        })
      );
      expect(props).toHaveLength(mockProps.length);
      expect(props[0].propType).toBe(mockProps[0].propType);
    });

    it('should fetch player props for MLB successfully', async () => {
      const mockProps = getMockPlayerProps('test-game-id', 'MLB');
      const mockResponse = {
        status: 200,
        data: mockProps
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const props = await SportsApiService.getPlayerPropsForGame('test-game-id', 'MLB');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/player-props/test-game-id',
        expect.objectContaining({
          params: { sport: 'MLB' },
          headers: {
            'x-api-key': expect.any(String)
          }
        })
      );
      expect(props).toHaveLength(mockProps.length);
      expect(props[0].propType).toBe(mockProps[0].propType);
    });

    it('should return empty array when API fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const props = await SportsApiService.getPlayerPropsForGame('test-game-id', 'NBA');

      expect(props).toEqual([]);
    });
  });
}); 