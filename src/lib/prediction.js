/** @typedef {'A+' | 'A' | 'A-' | 'B+'} Grade */

/** @type {Grade[]} */
export const GRADES = ['A+', 'A', 'A-', 'B+'];

/**
 * @param {number} confidence
 * @returns {Grade | null}
 */
export function getConfidenceGrade(confidence) {
  if (confidence >= 95) return 'A+';
  if (confidence >= 90) return 'A';
  if (confidence >= 85) return 'A-';
  if (confidence >= 75) return 'B+';
  return null;
} 