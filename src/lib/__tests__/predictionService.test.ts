import { PredictionService } from '../predictionService';
import { NBAStatsService } from '../nbaStatsApi';
import { MLBStatsService, PitcherDetails, PitcherStats } from '../mlbStatsApi';
import { Game, Prediction, SportType, PredictionType } from '@/models/types';

jest.mock('../nbaStatsApi');
jest.mock('../mlbStatsApi');

describe('PredictionService', () => {
  const mockNBAGame: Game = {
    id: 'test-nba-game-1',
    sport: 'NBA',
    homeTeamId: 'mia',
    awayTeamId: 'bos',
    homeTeamName: 'Miami Heat',
    awayTeamName: 'Boston Celtics',
    gameDate: '2025-04-07T23:00:00Z',
    startTime: '7:00 PM',
    status: 'scheduled',
    odds: {
      spread: {
        home: { line: -3.5, odds: -110 },
        away: { line: 3.5, odds: -110 }
      },
      total: {
        over: { line: 220.5, odds: -110 },
        under: { line: 220.5, odds: -110 }
      },
      moneyline: {
        home: -150,
        away: 130
      }
    }
  };

  const mockMLBGame: Game = {
    id: 'test-mlb-game-1',
    sport: 'MLB',
    homeTeamId: 'nyy',
    awayTeamId: 'bos',
    homeTeamName: 'New York Yankees',
    awayTeamName: 'Boston Red Sox',
    gameDate: '2025-04-07T23:00:00Z',
    startTime: '7:00 PM',
    status: 'scheduled',
    probableHomePitcherId: 12345,
    probableAwayPitcherId: 67890,
    odds: {
      spread: {
        home: { line: -1.5, odds: 120 },
        away: { line: 1.5, odds: -140 }
      },
      total: {
        over: { line: 8.5, odds: -110 },
        under: { line: 8.5, odds: -110 }
      },
      moneyline: {
        home: -130,
        away: 110
      }
    }
  };

  const mockNBAStats = {
    wins: 40, losses: 20, homeWins: 25, homeLosses: 8, awayWins: 15, awayLosses: 12,
    lastTenWins: 7, avgPointsScored: 112.5, avgPointsAllowed: 105.2,
    offensiveRating: 115.0, defensiveRating: 108.0, pace: 99.5
  };
  const mockNBAH2HStats = {
    totalGames: 4, homeTeamWins: 3, awayTeamWins: 1, averagePointsDiff: 5.5
  };
  const mockMLBStats = {
    wins: 50, losses: 30, homeWins: 30, homeLosses: 12, awayWins: 20, awayLosses: 18,
    lastTenWins: 6, avgRunsScored: 5.2, avgRunsAllowed: 3.8,
    teamERA: 3.75, teamWHIP: 1.25, opsVsLHP: 0.750, opsVsRHP: 0.700
  };
  const mockMLBH2HStats = {
    totalGames: 6, homeTeamWins: 4, awayTeamWins: 2, averageRunsDiff: 1.5
  };
  const mockMLBPitcherStats = { era: "3.50", whip: "1.20", strikeoutRate: 9.5, walkRate: 2.8 };
  const mockMLBPitcherDetails = { pitchHand: { code: 'R' as 'R' | 'L' } };

  beforeEach(() => {
    jest.clearAllMocks();
    (NBAStatsService.getTeamStats as jest.Mock).mockResolvedValue(mockNBAStats);
    (NBAStatsService.getH2HStats as jest.Mock).mockResolvedValue(mockNBAH2HStats);
    (MLBStatsService.getTeamStats as jest.Mock).mockResolvedValue(mockMLBStats);
    (MLBStatsService.getH2HStats as jest.Mock).mockResolvedValue(mockMLBH2HStats);
    (MLBStatsService.getPitcherStats as jest.Mock).mockResolvedValue(mockMLBPitcherStats);
    (MLBStatsService.getPitcherDetails as jest.Mock).mockResolvedValue(mockMLBPitcherDetails);
  });

  describe('getPredictionsForGame', () => {
    const validatePrediction = (prediction: Prediction, expectedGameId: string) => {
      expect(prediction).toBeDefined();
      expect(prediction).toHaveProperty('id');
      expect(typeof prediction.id).toBe('string');
      expect(prediction).toHaveProperty('gameId', expectedGameId);
      expect(prediction).toHaveProperty('predictionType');
      expect(['MONEYLINE', 'SPREAD', 'TOTAL']).toContain(prediction.predictionType);
      expect(prediction).toHaveProperty('predictionValue');
      expect(typeof prediction.predictionValue).toBe('number');
      expect(prediction).toHaveProperty('confidence');
      expect(typeof prediction.confidence).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
      expect(prediction).toHaveProperty('grade');
      expect(['A', 'B', 'C', 'D', 'F']).toContain(prediction.grade);
      expect(prediction).toHaveProperty('reasoning');
      expect(typeof prediction.reasoning).toBe('string');
      expect(prediction.reasoning.length).toBeGreaterThan(0);
      expect(prediction).toHaveProperty('createdAt');
      expect(typeof prediction.createdAt).toBe('string'); 
    };

    it('should generate an array of 3 valid predictions for an NBA game', async () => {
      const predictions = await PredictionService.getPredictionsForGame(mockNBAGame);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(3);

      predictions.forEach(p => validatePrediction(p, mockNBAGame.id));

      expect(NBAStatsService.getTeamStats).toHaveBeenCalledTimes(2);
      expect(NBAStatsService.getH2HStats).toHaveBeenCalledTimes(1);
    });

    it('should generate an array of 3 valid predictions for an MLB game', async () => {
      const predictions = await PredictionService.getPredictionsForGame(mockMLBGame);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(3);

      predictions.forEach(p => validatePrediction(p, mockMLBGame.id));

      expect(MLBStatsService.getTeamStats).toHaveBeenCalledTimes(2);
      expect(MLBStatsService.getH2HStats).toHaveBeenCalledTimes(1);
      if (mockMLBGame.probableHomePitcherId && mockMLBGame.probableAwayPitcherId) {
        expect(MLBStatsService.getPitcherStats).toHaveBeenCalledWith(mockMLBGame.probableHomePitcherId);
        expect(MLBStatsService.getPitcherStats).toHaveBeenCalledWith(mockMLBGame.probableAwayPitcherId);
        expect(MLBStatsService.getPitcherDetails).toHaveBeenCalledWith(mockMLBGame.probableHomePitcherId);
        expect(MLBStatsService.getPitcherDetails).toHaveBeenCalledWith(mockMLBGame.probableAwayPitcherId);
      }
    });

    it('should return an empty array if required team stats are missing', async () => {
      (NBAStatsService.getTeamStats as jest.Mock).mockImplementation(async (teamName) => {
        if (teamName === mockNBAGame.homeTeamName) return null;
        return mockNBAStats;
      });
      
      const predictions = await PredictionService.getPredictionsForGame(mockNBAGame);

      expect(predictions).toEqual([]);
      expect(NBAStatsService.getTeamStats).toHaveBeenCalledWith(mockNBAGame.homeTeamName);
      expect(NBAStatsService.getTeamStats).toHaveBeenCalledWith(mockNBAGame.awayTeamName);
    });

    it('should still generate predictions if MLB pitcher stats/details are missing', async () => {
      (MLBStatsService.getPitcherStats as jest.Mock).mockResolvedValue(null);
      (MLBStatsService.getPitcherDetails as jest.Mock).mockResolvedValue(null);

      const predictions = await PredictionService.getPredictionsForGame(mockMLBGame);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(3);
      
      predictions.forEach(p => validatePrediction(p, mockMLBGame.id));

      expect(MLBStatsService.getPitcherStats).toHaveBeenCalledTimes(2);
      expect(MLBStatsService.getPitcherDetails).toHaveBeenCalledTimes(2);
    });

    it('should return fewer predictions if odds for a type are missing', async () => {
        const gameMissingSpread: Game = { 
            ...mockNBAGame, 
            odds: { 
                moneyline: mockNBAGame.odds?.moneyline, 
                total: mockNBAGame.odds?.total 
            } 
        };
        const predictions = await PredictionService.getPredictionsForGame(gameMissingSpread);
        expect(predictions.length).toBe(2);
        expect(predictions.some(p => p.predictionType === 'MONEYLINE')).toBe(true);
        expect(predictions.some(p => p.predictionType === 'TOTAL')).toBe(true);
        expect(predictions.some(p => p.predictionType === 'SPREAD')).toBe(false);
    });
  });
});