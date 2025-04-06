import { SportsDataApi, TheOddsApi, OpenAiApi } from '@/lib/api';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SportsDataApi', () => {
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

      const result = await SportsDataApi.getUpcomingGames('NBA');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/nba/scores/json/Games/2024'),
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

      const result = await SportsDataApi.getUpcomingGames('MLB');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/mlb/scores/json/Games/2024'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await SportsDataApi.getUpcomingGames('NBA');

      expect(result).toEqual([]);
    });
  });

  describe('TheOddsApi', () => {
    it('should fetch odds successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            sport: 'NBA',
            gameId: 'game-1',
            homeTeam: 'Lakers',
            awayTeam: 'Warriors',
            commenceTime: new Date().toISOString(),
            bookmakers: [
              {
                key: 'test-bookmaker',
                markets: [
                  {
                    key: 'spreads',
                    outcomes: [
                      { name: 'Lakers', price: -110 },
                      { name: 'Warriors', price: -110 }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await TheOddsApi.getOdds('NBA');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/sports/'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockedAxios.get.mockRejectedValueOnce(error);

      const result = await TheOddsApi.getOdds('NBA');

      expect(result).toEqual([]);
    });
  });

  describe('OpenAiApi', () => {
    it('should generate predictions successfully', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  predictions: [
                    {
                      type: 'SPREAD',
                      value: 'HOME -5.5',
                      confidence: 0.75,
                      reasoning: 'Test reasoning'
                    }
                  ]
                })
              }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await OpenAiApi.generatePredictions({
        sport: 'NBA',
        homeTeam: 'Lakers',
        awayTeam: 'Warriors',
        gameDate: new Date().toISOString()
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('api.openai.com'),
        expect.any(Object),
        expect.any(Object)
      );
      expect(result).toEqual(JSON.parse(mockResponse.data.choices[0].message.content));
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockedAxios.post.mockRejectedValueOnce(error);

      const result = await OpenAiApi.generatePredictions({
        sport: 'NBA',
        homeTeam: 'Lakers',
        awayTeam: 'Warriors',
        gameDate: new Date().toISOString()
      });

      expect(result).toEqual({ predictions: [] });
    });
  });
}); 