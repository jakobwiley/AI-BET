import { SportsApiService } from '@/lib/sportsApi';
import axios from 'axios';

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
        data: [
          {
            id: '1',
            sport: 'NBA',
            gameDate: new Date().toISOString(),
            homeTeamId: '1',
            awayTeamId: '2',
            homeTeamName: 'Lakers',
            awayTeamName: 'Warriors',
            status: 'SCHEDULED'
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await SportsApiService.getUpcomingGames('NBA');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/nba/games'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch MLB games successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            sport: 'MLB',
            gameDate: new Date().toISOString(),
            homeTeamId: '1',
            awayTeamId: '2',
            homeTeamName: 'Yankees',
            awayTeamName: 'Red Sox',
            status: 'SCHEDULED'
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await SportsApiService.getUpcomingGames('MLB');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/mlb/games'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await SportsApiService.getUpcomingGames('NBA');

      expect(result).toEqual([]);
    });
  });

  describe('getPredictionsForGame', () => {
    it('should fetch game predictions successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            gameId: 'game-1',
            predictionType: 'SPREAD',
            predictionValue: 'HOME -5.5',
            confidence: 0.75,
            reasoning: 'Test reasoning',
            createdAt: new Date().toISOString()
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await SportsApiService.getPredictionsForGame('game-1');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/predictions/game-1'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await SportsApiService.getPredictionsForGame('game-1');

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerPropsForGame', () => {
    it('should fetch NBA player props successfully', async () => {
      const mockResponse = {
        data: [
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
            createdAt: new Date().toISOString()
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await SportsApiService.getPlayerPropsForGame('game-1', 'NBA');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/player-props/game-1'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch MLB player props successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            gameId: 'game-1',
            playerId: 'player-1',
            playerName: 'Aaron Judge',
            teamId: 'team-1',
            propType: 'HITS',
            overUnderValue: 1.5,
            predictionValue: 'OVER',
            confidence: 0.75,
            reasoning: 'Test reasoning',
            createdAt: new Date().toISOString()
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await SportsApiService.getPlayerPropsForGame('game-1', 'MLB');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/player-props/game-1'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await SportsApiService.getPlayerPropsForGame('game-1', 'NBA');

      expect(result).toEqual([]);
    });
  });
}); 