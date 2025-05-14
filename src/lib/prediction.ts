export const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'] as const;
export type Grade = typeof grades[number];

export function getConfidenceGrade(confidence: number): Grade {
  // Normalize confidence to percentage (0-100)
  const confidencePercent = confidence > 1 ? confidence : confidence * 100;
  
  if (confidencePercent >= 90) return 'A+';
  if (confidencePercent >= 85) return 'A';
  if (confidencePercent >= 80) return 'A-';
  if (confidencePercent >= 75) return 'B+';
  if (confidencePercent >= 70) return 'B';
  if (confidencePercent >= 65) return 'B-';
  if (confidencePercent >= 60) return 'C+';
  return 'C';
} 