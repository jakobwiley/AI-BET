import { OddsApiService } from '@/lib/oddsApi';
import { Game, Prediction, SportType } from '@/models/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OddsApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGamePredictions', () => {
    const mockGameId = 'test-game-123';
    const mockSport: SportType = 'NBA';

    it('should format predictions with string values', async () => {
      const mockOddsResponse = {
        data: [{
          id: mockGameId,
          home_team: 'Lakers',
          away_team: 'Celtics',
          bookmakers: [{
            key: 'draftkings',
            markets: [
              {
                key: 'spreads',
                outcomes: [
                  { name: 'Lakers', point: -5.5, price: -110 },
                  { name: 'Celtics', point: 5.5, price: -110 }
                ]
              },
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Lakers', price: -180 },
                  { name: 'Celtics', price: 160 }
                ]
              },
              {
                key: 'totals',
                outcomes: [
                  { name: 'Over', point: 220.5, price: -110 },
                  { name: 'Under', point: 220.5, price: -110 }
                ]
              }
            ]
          }]
        }]
      };

      mockedAxios.get.mockResolvedValueOnce(mockOddsResponse);

      const predictions = await OddsApiService.getGamePredictions(mockGameId, mockSport);

      // Verify predictions are formatted correctly
      expect(predictions).toHaveLength(3); // One for each market type
      
      // Check spread prediction
      const spreadPrediction = predictions.find(p => p.predictionType === 'SPREAD');
      expect(spreadPrediction?.predictionValue).toBe('-5.5');
      
      // Check moneyline prediction
      const moneylinePrediction = predictions.find(p => p.predictionType === 'MONEYLINE');
      expect(moneylinePrediction?.predictionValue).toBe('-180');
      
      // Check total prediction
      const totalPrediction = predictions.find(p => p.predictionType === 'TOTAL');
      expect(totalPrediction?.predictionValue).toBe('O/U 220.5');
    });

    it('should handle missing odds data gracefully', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });
      const predictions = await OddsApiService.getGamePredictions(mockGameId, mockSport);
      expect(predictions).toEqual([]);
    });
  });

  describe('getGameOdds', () => {
    const mockSport: SportType = 'NBA';

    it('should transform odds data correctly', async () => {
      const mockResponse = {
        data: [{
          id: 'test-game-123',
          sport_key: 'basketball_nba',
          home_team: 'Lakers',
          away_team: 'Celtics',
          commence_time: '2024-03-20T00:00:00Z',
          bookmakers: [{
            key: 'draftkings',
            markets: [
              {
                key: 'spreads',
                outcomes: [
                  { name: 'Lakers', point: -5.5, price: -110 },
                  { name: 'Celtics', point: 5.5, price: -110 }
                ]
              },
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Lakers', price: -180 },
                  { name: 'Celtics', price: 160 }
                ]
              }
            ]
          }]
        }]
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const games = await OddsApiService.getGameOdds(mockSport);

      expect(games).toHaveLength(1);
      const game = games[0];
      
      expect(game.spread).toEqual({ home: -5.5, away: 5.5 });
      expect(game.moneyline).toEqual({ home: -180, away: 160 });
      expect(game.homeTeamName).toBe('Lakers');
      expect(game.awayTeamName).toBe('Celtics');
    });
  });

  describe('API key validation', () => {
    it('should test API key validity', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [], status: 200 });
      const isValid = await OddsApiService.testApiKey();
      expect(isValid).toBe(true);
    });

    it('should handle invalid API key', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Invalid API key'));
      const isValid = await OddsApiService.testApiKey();
      expect(isValid).toBe(false);
    });
  });
}); 