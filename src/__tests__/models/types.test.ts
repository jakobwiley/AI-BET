import { SportType, PredictionType, PlayerPropType } from '@/models/types';

describe('Types', () => {
  describe('SportType', () => {
    it('should have correct values', () => {
      const nba: SportType = 'NBA';
      const mlb: SportType = 'MLB';
      expect(nba).toBe('NBA');
      expect(mlb).toBe('MLB');
    });
  });

  describe('PredictionType', () => {
    it('should have correct values', () => {
      const spread: PredictionType = 'SPREAD';
      const moneyline: PredictionType = 'MONEYLINE';
      const total: PredictionType = 'TOTAL';
      const overUnder: PredictionType = 'OVER_UNDER';
      expect(spread).toBe('SPREAD');
      expect(moneyline).toBe('MONEYLINE');
      expect(total).toBe('TOTAL');
      expect(overUnder).toBe('OVER_UNDER');
    });
  });

  describe('PlayerPropType', () => {
    it('should have correct values for NBA', () => {
      const points: PlayerPropType = 'POINTS';
      const rebounds: PlayerPropType = 'REBOUNDS';
      const assists: PlayerPropType = 'ASSISTS';
      const steals: PlayerPropType = 'STEALS';
      expect(points).toBe('POINTS');
      expect(rebounds).toBe('REBOUNDS');
      expect(assists).toBe('ASSISTS');
      expect(steals).toBe('STEALS');
    });

    it('should have correct values for MLB', () => {
      const hits: PlayerPropType = 'HITS';
      const homeRuns: PlayerPropType = 'HOME_RUNS';
      const rbi: PlayerPropType = 'RBI';
      const strikeouts: PlayerPropType = 'STRIKEOUTS';
      expect(hits).toBe('HITS');
      expect(homeRuns).toBe('HOME_RUNS');
      expect(rbi).toBe('RBI');
      expect(strikeouts).toBe('STRIKEOUTS');
    });
  });
}); 