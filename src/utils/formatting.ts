import { PredictionType } from '@/models/types';

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

export function formatPredictionType(type: PredictionType): string {
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