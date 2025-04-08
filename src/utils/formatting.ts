import { PredictionType, PlayerPropType } from '@/models/types';

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  }).format(dateObj);
}

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : odds.toString();
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function formatPredictionType(type: string): string {
  switch (type) {
    case 'SPREAD':
      return 'Spread';
    case 'MONEYLINE':
      return 'Moneyline';
    case 'TOTAL':
      return 'Total';
    default:
      return type;
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'text-green-500';
  if (confidence >= 0.4) return 'text-yellow-500';
  return 'text-red-500';
}

export function formatPlayerPropType(type: string): string {
  switch (type) {
    // NBA Props
    case 'POINTS':
      return 'Points';
    case 'REBOUNDS':
      return 'Rebounds';
    case 'ASSISTS':
      return 'Assists';
    case 'THREES':
      return 'Three Pointers';
    case 'BLOCKS':
      return 'Blocks';
    case 'STEALS':
      return 'Steals';
    case 'DOUBLE_DOUBLE':
      return 'Double Double';
    case 'TRIPLE_DOUBLE':
      return 'Triple Double';
    case 'FANTASY_SCORE':
      return 'Fantasy Score';
    case 'MINUTES':
      return 'Minutes';
    // MLB Props
    case 'HITS':
      return 'Hits';
    case 'HOME_RUNS':
      return 'Home Runs';
    case 'RBIS':
      return 'RBIs';
    case 'STRIKEOUTS':
      return 'Strikeouts';
    case 'EARNED_RUNS':
      return 'Earned Runs';
    case 'INNINGS_PITCHED':
      return 'Innings Pitched';
    default:
      return type.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  }
} 