import { SportType, PredictionType, PlayerPropType } from '@/models/types';

describe('Types', () => {
  describe('SportType', () => {
    it('should have correct values', () => {
      expect(SportType.NBA).toBe('NBA');
      expect(SportType.MLB).toBe('MLB');
    });
  });

  describe('PredictionType', () => {
    it('should have correct values', () => {
      expect(PredictionType.SPREAD).toBe('SPREAD');
      expect(PredictionType.MONEYLINE).toBe('MONEYLINE');
      expect(PredictionType.TOTAL).toBe('TOTAL');
    });
  });

  describe('PlayerPropType', () => {
    it('should have correct values for NBA', () => {
      expect(PlayerPropType.POINTS).toBe('POINTS');
      expect(PlayerPropType.REBOUNDS).toBe('REBOUNDS');
      expect(PlayerPropType.ASSISTS).toBe('ASSISTS');
      expect(PlayerPropType.STEALS).toBe('STEALS');
      expect(PlayerPropType.BLOCKS).toBe('BLOCKS');
      expect(PlayerPropType.THREES).toBe('THREES');
    });

    it('should have correct values for MLB', () => {
      expect(PlayerPropType.HITS).toBe('HITS');
      expect(PlayerPropType.HOME_RUNS).toBe('HOME_RUNS');
      expect(PlayerPropType.RBIS).toBe('RBIS');
      expect(PlayerPropType.STRIKEOUTS).toBe('STRIKEOUTS');
      expect(PlayerPropType.WALKS).toBe('WALKS');
    });
  });
}); 