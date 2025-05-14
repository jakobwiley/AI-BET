import { PredictionService } from '../predictionService.js';
import { MLBStatsService } from '../mlbStatsApi.js';
import { Game, PredictionType } from '@/models/types.js';
import { TeamStats, H2HStats } from '../predictionService.js';

describe('PredictionService Integration', () => {
  const mockMLBGame: Game = {
    id: 'mlb-game-1',
    sport: 'MLB',
    status: 'SCHEDULED',
    homeTeamId: 'nyy',
    awayTeamId: 'bos',
    homeTeamName: 'Yankees',
    awayTeamName: 'Red Sox',
    gameDate: '2025-04-07T23:00:00Z',
    startTime: '7:00 PM',
    odds: {
      spread: {
        homeSpread: '-1.5',
        awaySpread: '1.5',
        homeOdds: '-110',
        awayOdds: '-110'
      },
      total: {
        overUnder: '8.5',
        overOdds: '-110',
        underOdds: '-110'
      },
      moneyline: {
        homeOdds: '-130',
        awayOdds: '110'
      }
    }
  };

  describe('MLB Game Predictions', () => {
    it('should generate predictions with player statistics', async () => {
      // Mock the MLBStatsService responses
      jest.spyOn(MLBStatsService, 'getTeamStats').mockImplementation(async (teamName: string) => {
        const mockStats: TeamStats = {
          wins: teamName === 'Yankees' ? 50 : 45,
          losses: teamName === 'Yankees' ? 30 : 35,
          homeWinPercentage: teamName === 'Yankees' ? 0.65 : 0.60,
          awayWinPercentage: teamName === 'Yankees' ? 0.45 : 0.40,
          lastTenGames: teamName === 'Yankees' ? '6-4' : '5-5',
          runsScored: teamName === 'Yankees' ? 450 : 420,
          runsAllowed: teamName === 'Yankees' ? 380 : 400,
          teamERA: teamName === 'Yankees' ? 3.75 : 4.00,
          teamWHIP: teamName === 'Yankees' ? 1.25 : 1.30,
          avgVsLHP: teamName === 'Yankees' ? 0.280 : 0.270,
          avgVsRHP: teamName === 'Yankees' ? 0.265 : 0.260,
          pointsFor: teamName === 'Yankees' ? 450 : 420,
          pointsAgainst: teamName === 'Yankees' ? 380 : 400,
          streak: teamName === 'Yankees' ? 3 : -2,
          winPercentage: teamName === 'Yankees' ? 0.625 : 0.563,
          keyPlayers: {
            batting: [
              {
                avg: teamName === 'Yankees' ? '0.300' : '0.290',
                obp: teamName === 'Yankees' ? '0.400' : '0.380',
                slg: teamName === 'Yankees' ? '0.600' : '0.570',
                ops: teamName === 'Yankees' ? '1.000' : '0.950',
                wOBA: teamName === 'Yankees' ? '0.450' : '0.420',
                wRCPlus: teamName === 'Yankees' ? 180 : 160,
                war: teamName === 'Yankees' ? '6.5' : '5.2'
              }
            ],
            pitching: [
              {
                era: teamName === 'Yankees' ? '2.50' : '3.00',
                whip: teamName === 'Yankees' ? '0.95' : '1.00',
                fip: teamName === 'Yankees' ? '2.80' : '3.10',
                xfip: teamName === 'Yankees' ? '2.90' : '3.20',
                k9: teamName === 'Yankees' ? '12.5' : '11.2',
                bb9: teamName === 'Yankees' ? '2.1' : '2.0',
                war: teamName === 'Yankees' ? '5.8' : '4.8'
              }
            ]
          }
        };
        return mockStats;
      });

      jest.spyOn(MLBStatsService, 'getH2HStats').mockImplementation(async () => {
        const mockH2HStats: H2HStats = {
          totalGames: 6,
          homeTeamWins: 4,
          awayTeamWins: 2,
          averageRunsDiff: 1.5,
          lastMeetingDate: '2024-04-01T23:00:00Z',
          lastMeetingResult: 'Yankees won 5-3'
        };
        return mockH2HStats;
      });

      // Generate predictions
      const predictions = await PredictionService.getPredictionsForGame(mockMLBGame);

      // Verify predictions
      expect(predictions).toHaveLength(3); // Moneyline, spread, and total
      predictions.forEach(prediction => {
        expect(prediction.gameId).toBe(mockMLBGame.id);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
        expect(prediction.reasoning).toContain('Player Statistics');
        expect(prediction.reasoning).toContain('Batting Strength');
        expect(prediction.reasoning).toContain('Pitching Strength');
      });

      // Verify moneyline prediction
      const moneylinePrediction = predictions.find(p => p.predictionType === 'MONEYLINE');
      expect(moneylinePrediction).toBeDefined();
      expect(moneylinePrediction?.confidence).toBeGreaterThan(50); // Yankees have better stats

      // Verify spread prediction
      const spreadPrediction = predictions.find(p => p.predictionType === 'SPREAD');
      expect(spreadPrediction).toBeDefined();
      expect(spreadPrediction?.predictionValue).toBe('-1.5');

      // Verify total prediction
      const totalPrediction = predictions.find(p => p.predictionType === 'TOTAL');
      expect(totalPrediction).toBeDefined();
      expect(totalPrediction?.predictionValue).toBe('8.5');
    });

    it('should handle missing player statistics gracefully', async () => {
      // Mock the MLBStatsService to return stats without player data
      jest.spyOn(MLBStatsService, 'getTeamStats').mockImplementation(async (teamName: string) => {
        const mockStats: TeamStats = {
          wins: teamName === 'Yankees' ? 50 : 45,
          losses: teamName === 'Yankees' ? 30 : 35,
          homeWinPercentage: teamName === 'Yankees' ? 0.65 : 0.60,
          awayWinPercentage: teamName === 'Yankees' ? 0.45 : 0.40,
          lastTenGames: teamName === 'Yankees' ? '6-4' : '5-5',
          runsScored: teamName === 'Yankees' ? 450 : 420,
          runsAllowed: teamName === 'Yankees' ? 380 : 400,
          teamERA: teamName === 'Yankees' ? 3.75 : 4.00,
          teamWHIP: teamName === 'Yankees' ? 1.25 : 1.30,
          avgVsLHP: teamName === 'Yankees' ? 0.280 : 0.270,
          avgVsRHP: teamName === 'Yankees' ? 0.265 : 0.260,
          pointsFor: teamName === 'Yankees' ? 450 : 420,
          pointsAgainst: teamName === 'Yankees' ? 380 : 400,
          streak: teamName === 'Yankees' ? 3 : -2,
          winPercentage: teamName === 'Yankees' ? 0.625 : 0.563
        };
        return mockStats;
      });

      // Generate predictions
      const predictions = await PredictionService.getPredictionsForGame(mockMLBGame);

      // Verify predictions still work without player stats
      expect(predictions).toHaveLength(3);
      predictions.forEach(prediction => {
        expect(prediction.gameId).toBe(mockMLBGame.id);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
        expect(prediction.reasoning).not.toContain('Player Statistics');
      });
    });

    it('should adjust confidence based on player statistics', async () => {
      // Mock the MLBStatsService to return stats with varying player quality
      jest.spyOn(MLBStatsService, 'getTeamStats').mockImplementation(async (teamName: string) => {
        const mockStats: TeamStats = {
          wins: 50,
          losses: 30,
          homeWinPercentage: 0.65,
          awayWinPercentage: 0.45,
          lastTenGames: '6-4',
          runsScored: 450,
          runsAllowed: 380,
          teamERA: 3.75,
          teamWHIP: 1.25,
          avgVsLHP: 0.280,
          avgVsRHP: 0.265,
          pointsFor: 450,
          pointsAgainst: 380,
          streak: 3,
          winPercentage: 0.625,
          keyPlayers: {
            batting: [
              {
                avg: teamName === 'Yankees' ? '0.350' : '0.250', // Significant difference
                obp: teamName === 'Yankees' ? '0.450' : '0.320',
                slg: teamName === 'Yankees' ? '0.650' : '0.400',
                ops: teamName === 'Yankees' ? '1.100' : '0.720',
                wOBA: teamName === 'Yankees' ? '0.500' : '0.320',
                wRCPlus: teamName === 'Yankees' ? 200 : 80,
                war: teamName === 'Yankees' ? '8.0' : '0.5'
              }
            ],
            pitching: [
              {
                era: teamName === 'Yankees' ? '2.00' : '4.50', // Significant difference
                whip: teamName === 'Yankees' ? '0.90' : '1.40',
                fip: teamName === 'Yankees' ? '2.50' : '4.20',
                xfip: teamName === 'Yankees' ? '2.60' : '4.30',
                k9: teamName === 'Yankees' ? '13.0' : '7.0',
                bb9: teamName === 'Yankees' ? '1.8' : '3.5',
                war: teamName === 'Yankees' ? '7.0' : '1.0'
              }
            ]
          }
        };
        return mockStats;
      });

      // Generate predictions
      const predictions = await PredictionService.getPredictionsForGame(mockMLBGame);

      // Verify confidence is higher due to significant player quality differences
      const moneylinePrediction = predictions.find(p => p.predictionType === 'MONEYLINE');
      expect(moneylinePrediction?.confidence).toBeGreaterThan(70); // Higher confidence due to player quality
    });
  });
}); 