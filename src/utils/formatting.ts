import { PredictionType, PlayerPropType } from '@/models/types';

export const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

export const formatPredictionType = (type: string): string => {
  switch (type) {
    case PredictionType.SPREAD:
      return 'Spread';
    case PredictionType.MONEYLINE:
      return 'Moneyline';
    case PredictionType.TOTAL:
      return 'Total';
    default:
      return type;
  }
};

export const formatPlayerPropType = (type: string): string => {
  switch (type) {
    // NBA
    case PlayerPropType.POINTS:
      return 'Points';
    case PlayerPropType.REBOUNDS:
      return 'Rebounds';
    case PlayerPropType.ASSISTS:
      return 'Assists';
    case PlayerPropType.STEALS:
      return 'Steals';
    case PlayerPropType.BLOCKS:
      return 'Blocks';
    case PlayerPropType.THREES:
      return 'Three Pointers';
    
    // MLB
    case PlayerPropType.HITS:
      return 'Hits';
    case PlayerPropType.HOME_RUNS:
      return 'Home Runs';
    case PlayerPropType.RBIS:
      return 'RBIs';
    case PlayerPropType.STRIKEOUTS:
      return 'Strikeouts';
    case PlayerPropType.WALKS:
      return 'Walks';
    default:
      return type;
  }
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.75) {
    return 'text-green-500';
  } else if (confidence >= 0.5) {
    return 'text-yellow-500';
  } else {
    return 'text-red-500';
  }
}; 