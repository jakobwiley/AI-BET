import { DraftKingsApiService } from '@/lib/draftkingsApi';
import { Game } from '@/models/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DraftKingsApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpcomingGames', () => {
    it('should return an array of games', async () => {
      const mockResponse = {
        data: {
          events: [{
            eventId: 123,
            homeTeamId: 1,
            awayTeamId: 2,
            homeTeamName: 'Los Angeles Lakers',
            awayTeamName: 'Golden State Warriors',
            startDate: '2024-04-07T19:00:00Z',
            eventStatus: 'SCHEDULED',
            homeTeamSpread: -5.5,
            homeTeamSpreadOdds: -110,
            awayTeamSpread: 5.5,
            awayTeamSpreadOdds: -110,
            overUnder: 220.5,
            overOdds: -110,
            underOdds: -110,
            homeTeamMoneyLine: -200,
            awayTeamMoneyLine: +180
          }]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const games = await DraftKingsApiService.getUpcomingGames('NBA');
      expect(Array.isArray(games)).toBe(true);
      expect(games.length).toBeGreaterThan(0);

      const game = games[0];
      expect(game).toHaveProperty('id', '123');
      expect(game).toHaveProperty('sport', 'NBA');
      expect(game).toHaveProperty('homeTeamName', 'Los Angeles Lakers');
      expect(game).toHaveProperty('awayTeamName', 'Golden State Warriors');
      expect(game).toHaveProperty('gameDate');
      expect(game).toHaveProperty('startTime');
      expect(game).toHaveProperty('status', 'scheduled');
      expect(game).toHaveProperty('odds');
      
      // Add type assertion since we know odds exist from our mock data
      const odds = game.odds!;
      expect(odds).toHaveProperty('spread');
      expect(odds.spread).toHaveProperty('home');
      expect(odds.spread.home).toHaveProperty('line', -5.5);
      expect(odds.spread.home).toHaveProperty('odds', -110);
      expect(odds.total.over).toHaveProperty('line', 220.5);
      expect(odds.moneyline).toHaveProperty('home', -200);
      expect(odds.moneyline).toHaveProperty('away', 180);
    });

    it('should handle errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API error'));

      const games = await DraftKingsApiService.getUpcomingGames('NBA');
      expect(Array.isArray(games)).toBe(true);
      expect(games.length).toBe(0);
    });
  });
}); 