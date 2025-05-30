import { PredictionType } from '@prisma/client';

interface GameStats {
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  homeTeamWinRate?: number;
  awayTeamWinRate?: number;
}

interface PredictionInput {
  predictionType: PredictionType;
  rawConfidence: number;  // Original confidence from base model
  predictionValue: string;
  game: GameStats;
  recentHomeScores?: number[];  // Last 5 games
  recentAwayScores?: number[];  // Last 5 games
  homeTeamWinRate?: number;    // Recent win rate
  awayTeamWinRate?: number;    // Recent win rate
}

interface CalibrationConfig {
  // Optimal confidence ranges based on analysis
  maxConfidence: number;  // Cap at 0.85 based on performance data
  optimalRange: {
    min: number;  // 0.75
    max: number;  // 0.80
  };
  // Type-specific performance factors
  typeWeights: {
    [PredictionType.SPREAD]: number;    // 1.1 (best performing)
    [PredictionType.MONEYLINE]: number; // 1.0 (baseline)
    [PredictionType.TOTAL]: number;     // 0.9 (most volatile)
  };
}

const DEFAULT_CONFIG: CalibrationConfig = {
  maxConfidence: 0.85,
  optimalRange: {
    min: 0.75,
    max: 0.80
  },
  typeWeights: {
    [PredictionType.SPREAD]: 1.1,
    [PredictionType.MONEYLINE]: 1.0,
    [PredictionType.TOTAL]: 0.9
  }
};

export class EnhancedPredictionModel {
  private config: CalibrationConfig;

  constructor(config: Partial<CalibrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private calibrateConfidence(rawConfidence: number, type: PredictionType): number {
    // Apply type-specific weight
    let adjustedConfidence = rawConfidence * this.config.typeWeights[type];

    // Scale down high confidence predictions
    if (adjustedConfidence > this.config.maxConfidence) {
      const excess = adjustedConfidence - this.config.maxConfidence;
      adjustedConfidence = this.config.maxConfidence - (excess * 0.5);
    }

    // Ensure confidence stays within optimal range if it was high to begin with
    if (rawConfidence > this.config.optimalRange.max) {
      adjustedConfidence = Math.min(
        adjustedConfidence,
        this.config.optimalRange.max + ((adjustedConfidence - this.config.optimalRange.max) * 0.3)
      );
    }

    return adjustedConfidence;
  }

  private adjustForHomeAdvantage(confidence: number, game: GameStats): number {
    // Increase confidence slightly for strong home teams
    if (game.homeTeamWinRate && game.homeTeamWinRate > 0.6) {
      confidence *= 1.05;
    }
    return confidence;
  }

  private adjustForRecentScoring(
    confidence: number,
    type: PredictionType,
    recentHomeScores: number[] = [],
    recentAwayScores: number[] = []
  ): number {
    if (type === PredictionType.TOTAL) {
      // Calculate scoring consistency
      const allScores = [...recentHomeScores, ...recentAwayScores];
      if (allScores.length > 0) {
        const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const variance = allScores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / allScores.length;
        const consistency = 1 / (1 + Math.sqrt(variance) / avg);
        
        // Reduce confidence for inconsistent scoring
        confidence *= (0.8 + (0.2 * consistency));
      }
    }
    return confidence;
  }

  private validatePredictionValue(value: string, type: PredictionType): boolean {
    switch (type) {
      case PredictionType.TOTAL:
        return value.startsWith('o') || value.startsWith('u');
      case PredictionType.SPREAD:
        return !['0', '0.0'].includes(value);
      case PredictionType.MONEYLINE:
        return !['0', '1', '-1'].includes(value);
      default:
        return true;
    }
  }

  public calculateConfidence(input: PredictionInput): number {
    // Validate prediction value
    if (!this.validatePredictionValue(input.predictionValue, input.predictionType)) {
      return Math.min(input.rawConfidence * 0.7, 0.65); // Significantly reduce confidence for questionable values
    }

    // Start with base confidence and apply calibration
    let confidence = this.calibrateConfidence(input.rawConfidence, input.predictionType);

    // Apply home advantage adjustment
    confidence = this.adjustForHomeAdvantage(confidence, input.game);

    // Adjust for recent scoring patterns
    confidence = this.adjustForRecentScoring(
      confidence,
      input.predictionType,
      input.recentHomeScores,
      input.recentAwayScores
    );

    // Additional type-specific adjustments
    switch (input.predictionType) {
      case PredictionType.SPREAD:
        // Slightly boost spread predictions in optimal range
        if (confidence >= 0.75 && confidence <= 0.80) {
          confidence *= 1.05;
        }
        break;
      case PredictionType.TOTAL:
        // Cap total predictions at a lower maximum
        confidence = Math.min(confidence, 0.82);
        break;
    }

    // Final bounds check
    return Math.min(Math.max(confidence, 0.5), this.config.maxConfidence);
  }

  public getPredictionQuality(input: PredictionInput): {
    confidence: number;
    recommendation: string;
    warning?: string;
  } {
    const confidence = this.calculateConfidence(input);
    let recommendation = 'PROCEED';
    let warning: string | undefined;

    // Quality checks
    if (input.predictionType === PredictionType.TOTAL && confidence > 0.80) {
      recommendation = 'CAUTION';
      warning = 'High confidence total predictions have shown lower accuracy';
    }

    if (!this.validatePredictionValue(input.predictionValue, input.predictionType)) {
      recommendation = 'REJECT';
      warning = 'Invalid prediction value for type';
    }

    return {
      confidence,
      recommendation,
      warning
    };
  }
} 