export type Grade = 'A+' | 'A' | 'A-' | 'B+';

export function getConfidenceGrade(confidence: number): Grade | null {
  if (confidence >= 0.95) return 'A+';
  if (confidence >= 0.90) return 'A';
  if (confidence >= 0.85) return 'A-';
  if (confidence >= 0.75) return 'B+';
  return null;
} 