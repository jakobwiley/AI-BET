import axios from 'axios';
import { SportsApiService } from '@/lib/sportsApi';
import { SportType } from '@/models/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SportsApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpcomingGames', () => {
    it('should fetch NBA games successfully', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            GameID: '1',
            DateTime: '2024-04-06T19:00:00',
            HomeTeamID: '1',
            AwayTeamID: '2',
            HomeTeam: 'Lakers',
            AwayTeam: 'Warriors',
            Status: 'Scheduled'
          }
        ]
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
      expect(games).toHaveLength(1);
    });

    it('should fetch MLB games successfully', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            GameID: '1',
            DateTime: '2024-04-06T19:00:00',
            HomeTeamID: '1',
            AwayTeamID: '2',
            HomeTeam: 'Yankees',
            AwayTeam: 'Red Sox',
            Status: 'Scheduled'
          }
        ]
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
      expect(games).toHaveLength(1);
    });

    it('should return empty array when API fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const games = await SportsApiService.getUpcomingGames('NBA' as SportType);

      expect(games).toEqual([]);
    });
  });

  describe('getPredictionsForGame', () => {
    it('should fetch predictions successfully', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            predictionType: 'SPREAD',
            value: 'HOME -5.5',
            confidence: 0.75
          },
          {
            predictionType: 'MONEYLINE',
            value: 'HOME',
            confidence: 0.8
          },
          {
            predictionType: 'OVER_UNDER',
            value: 'OVER 220',
            confidence: 0.65
          }
        ]
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
      expect(predictions).toHaveLength(3);
    });

    it('should return empty array when API fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const predictions = await SportsApiService.getPredictionsForGame('test-game-id');

      expect(predictions).toEqual([]);
    });
  });

  describe('getPlayerPropsForGame', () => {
    it('should fetch player props for NBA successfully', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            playerName: 'LeBron James',
            propType: 'POINTS',
            overUnderValue: 24.5,
            predictionValue: 'OVER',
            confidence: 0.75
          }
        ]
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
      expect(props).toHaveLength(1);
      expect(props[0].propType).toBe('POINTS');
    });

    it('should fetch player props for MLB successfully', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            playerName: 'Aaron Judge',
            propType: 'HOME_RUNS',
            overUnderValue: 0.5,
            predictionValue: 'OVER',
            confidence: 0.65
          }
        ]
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
      expect(props).toHaveLength(1);
      expect(props[0].propType).toBe('HOME_RUNS');
    });

    it('should return empty array when API fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const props = await SportsApiService.getPlayerPropsForGame('test-game-id', 'NBA');

      expect(props).toEqual([]);
    });
  });
}); 