import { PredictorModel } from '../enhanced-predictions/predictorModel.js';
import { TeamStats, H2HStats } from '../predictionService.js';
import { Game, PredictionType, SportType } from '@/models/types.js';

describe('PredictorModel', () => {
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

  const mockHomeStats: TeamStats = {
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
          avg: '0.300',
          obp: '0.400',
          slg: '0.600',
          ops: '1.000',
          wOBA: '0.450',
          wRCPlus: 180,
          war: '6.5'
        },
        {
          avg: '0.280',
          obp: '0.350',
          slg: '0.500',
          ops: '0.850',
          wOBA: '0.380',
          wRCPlus: 140,
          war: '3.2'
        }
      ],
      pitching: [
        {
          era: '2.50',
          whip: '0.95',
          fip: '2.80',
          xfip: '2.90',
          k9: '12.5',
          bb9: '2.1',
          war: '5.8'
        },
        {
          era: '3.20',
          whip: '1.10',
          fip: '3.40',
          xfip: '3.50',
          k9: '9.8',
          bb9: '2.5',
          war: '3.5'
        }
      ]
    }
  };

  const mockAwayStats: TeamStats = {
    wins: 45,
    losses: 35,
    homeWinPercentage: 0.60,
    awayWinPercentage: 0.40,
    lastTenGames: '5-5',
    runsScored: 420,
    runsAllowed: 400,
    teamERA: 4.00,
    teamWHIP: 1.30,
    avgVsLHP: 0.270,
    avgVsRHP: 0.260,
    pointsFor: 420,
    pointsAgainst: 400,
    streak: -2,
    winPercentage: 0.563,
    keyPlayers: {
      batting: [
        {
          avg: '0.290',
          obp: '0.380',
          slg: '0.570',
          ops: '0.950',
          wOBA: '0.420',
          wRCPlus: 160,
          war: '5.2'
        },
        {
          avg: '0.270',
          obp: '0.340',
          slg: '0.480',
          ops: '0.820',
          wOBA: '0.360',
          wRCPlus: 130,
          war: '3.0'
        }
      ],
      pitching: [
        {
          era: '3.00',
          whip: '1.00',
          fip: '3.10',
          xfip: '3.20',
          k9: '11.2',
          bb9: '2.0',
          war: '4.8'
        },
        {
          era: '3.50',
          whip: '1.15',
          fip: '3.60',
          xfip: '3.70',
          k9: '9.5',
          bb9: '2.3',
          war: '3.2'
        }
      ]
    }
  };

  const mockH2HStats: H2HStats = {
    totalGames: 6,
    homeTeamWins: 4,
    awayTeamWins: 2,
    averageRunsDiff: 1.5,
    lastMeetingDate: '2024-04-01T23:00:00Z',
    lastMeetingResult: 'Yankees won 5-3'
  };

  describe('calculateEnhancedFactors', () => {
    it('should calculate all MLB factors correctly', () => {
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        mockHomeStats,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      // Base factors
      expect(factors.overallRecordFactor).toBeDefined();
      expect(factors.homeAwaySplitFactor).toBeDefined();
      expect(factors.recentFormFactor).toBeDefined();
      expect(factors.headToHeadFactor).toBeDefined();
      expect(factors.scoringDiffFactor).toBeDefined();

      // MLB specific factors
      expect(factors.pitcherMatchupFactor).toBeDefined();
      expect(factors.teamPitchingFactor).toBeDefined();
      expect(factors.batterHandednessFactor).toBeDefined();
      expect(factors.ballparkFactor).toBeDefined();

      // New player factors
      expect(factors.battingStrengthFactor).toBeDefined();
      expect(factors.pitchingStrengthFactor).toBeDefined();
      expect(factors.keyPlayerImpactFactor).toBeDefined();

      // All factors should be between 0 and 1
      Object.values(factors).forEach(value => {
        if (typeof value === 'number') {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should handle missing player statistics gracefully', () => {
      const statsWithoutPlayers = { ...mockHomeStats, keyPlayers: undefined };
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        statsWithoutPlayers,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      expect(factors.battingStrengthFactor).toBe(0.5);
      expect(factors.pitchingStrengthFactor).toBe(0.5);
      expect(factors.keyPlayerImpactFactor).toBe(0.5);
    });

    it('should calculate correct batting strength factor', () => {
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        mockHomeStats,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      // Home team has better batting stats (higher OPS and wRC+)
      expect(factors.battingStrengthFactor).toBeGreaterThan(0.5);
    });

    it('should calculate correct pitching strength factor', () => {
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        mockHomeStats,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      // Home team has better pitching stats (lower ERA and WHIP)
      expect(factors.pitchingStrengthFactor).toBeGreaterThan(0.5);
    });

    it('should calculate correct key player impact factor', () => {
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        mockHomeStats,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      // Home team has higher combined WAR for top players
      expect(factors.keyPlayerImpactFactor).toBeGreaterThan(0.5);
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate confidence for MLB moneyline prediction', () => {
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        mockHomeStats,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      const confidence = PredictorModel.calculateConfidence('MLB', 'MONEYLINE', factors);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(100);
      // Home team has better stats, so confidence should favor them
      expect(confidence).toBeGreaterThan(50);
    });

    it('should calculate confidence for MLB spread prediction', () => {
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        mockHomeStats,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      const confidence = PredictorModel.calculateConfidence('MLB', 'SPREAD', factors);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should calculate confidence for MLB total prediction', () => {
      const factors = PredictorModel.calculateEnhancedFactors(
        'MLB',
        mockHomeStats,
        mockAwayStats,
        mockH2HStats,
        mockMLBGame
      );

      const confidence = PredictorModel.calculateConfidence('MLB', 'TOTAL', factors);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(100);
    });
  });
}); 