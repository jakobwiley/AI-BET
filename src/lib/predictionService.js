export function getConfidenceGrade(confidence) {
  if (confidence >= 0.85) return 'A+';
  if (confidence >= 0.80) return 'A';
  if (confidence >= 0.75) return 'A-';
  return 'B+';
} 