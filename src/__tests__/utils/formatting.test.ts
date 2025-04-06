import { formatConfidence, formatPredictionType, formatPlayerPropType } from '@/utils/formatting';

describe('Formatting Utils', () => {
  describe('formatConfidence', () => {
    it('should format confidence as percentage', () => {
      expect(formatConfidence(0.75)).toBe('75%');
      expect(formatConfidence(0.5)).toBe('50%');
      expect(formatConfidence(0.25)).toBe('25%');
    });

    it('should handle edge cases', () => {
      expect(formatConfidence(0)).toBe('0%');
      expect(formatConfidence(1)).toBe('100%');
    });
  });

  describe('formatPredictionType', () => {
    it('should format prediction types correctly', () => {
      expect(formatPredictionType('SPREAD')).toBe('Spread');
      expect(formatPredictionType('MONEYLINE')).toBe('Moneyline');
      expect(formatPredictionType('TOTAL')).toBe('Total');
    });
  });

  describe('formatPlayerPropType', () => {
    it('should format NBA player prop types correctly', () => {
      expect(formatPlayerPropType('POINTS')).toBe('Points');
      expect(formatPlayerPropType('REBOUNDS')).toBe('Rebounds');
      expect(formatPlayerPropType('ASSISTS')).toBe('Assists');
      expect(formatPlayerPropType('STEALS')).toBe('Steals');
      expect(formatPlayerPropType('BLOCKS')).toBe('Blocks');
      expect(formatPlayerPropType('THREES')).toBe('Three Pointers');
    });

    it('should format MLB player prop types correctly', () => {
      expect(formatPlayerPropType('HITS')).toBe('Hits');
      expect(formatPlayerPropType('HOME_RUNS')).toBe('Home Runs');
      expect(formatPlayerPropType('RBIS')).toBe('RBIs');
      expect(formatPlayerPropType('STRIKEOUTS')).toBe('Strikeouts');
      expect(formatPlayerPropType('WALKS')).toBe('Walks');
    });
  });
}); 