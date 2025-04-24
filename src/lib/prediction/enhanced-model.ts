import { PredictionType } from '@prisma/client';

export interface GameStats {
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  homeTeamWinRate?: number;
  awayTeamWinRate?: number;
}

export interface PredictionInput {
  predictionType: string;
  rawConfidence: number;  // Original confidence from base model
  predictionValue: string;
  game: GameStats;
  recentHomeScores?: number[];  // Last 5 games
  recentAwayScores?: number[];  // Last 5 games
  homeTeamWinRate?: number;    // Recent win rate
  awayTeamWinRate?: number;    // Recent win rate
  historicalAccuracy?: {  // New field for historical performance
    type: string;
    accuracy: number;
    sampleSize: number;
  };
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
    SPREAD: number;    // 1.1 (best performing)
    MONEYLINE: number; // 1.0 (baseline)
    TOTAL: number;     // 0.9 (most volatile)
  };
}

const DEFAULT_CONFIG: CalibrationConfig = {
  maxConfidence: 0.85,
  optimalRange: {
    min: 0.75,
    max: 0.80
  },
  typeWeights: {
    SPREAD: 1.1,
    MONEYLINE: 1.0,
    TOTAL: 0.9
  }
};

export interface QualityAssessment {
  confidence: number;
  warning?: string;
  recommendation: 'ACCEPT' | 'REJECT';
}

export class EnhancedPredictionModel {
  private config: CalibrationConfig;

  constructor(config: Partial<CalibrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private calibrateConfidence(rawConfidence: number, type: string): number {
    // Apply type-specific weight
    let adjustedConfidence = rawConfidence * this.config.typeWeights[type as keyof typeof this.config.typeWeights];

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
    type: string,
    recentHomeScores: number[] = [],
    recentAwayScores: number[] = []
  ): number {
    if (type === 'TOTAL') {
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

  private validateTotalPrediction(value: string, game: GameStats): { isValid: boolean; warning?: string; confidenceAdjustment: number } {
    const totalMatch = value.match(/^(OVER|UNDER)\s*(\d+(\.\d+)?)$/i);
    if (!totalMatch) {
      return { isValid: false, warning: 'Invalid total format', confidenceAdjustment: 0.7 };
    }

    const totalValue = parseFloat(totalMatch[2]);
    const direction = totalMatch[1].toUpperCase();

    // Check for reasonable total range based on sport (assuming baseball for now)
    if (totalValue < 5) {
      return { isValid: true, warning: 'Unusually low total', confidenceAdjustment: 0.75 };
    }
    if (totalValue > 12) {
      return { isValid: true, warning: 'Unusually high total', confidenceAdjustment: 0.8 };
    }

    // Check for half-runs in baseball (unusual)
    if (totalValue % 1 !== 0) {
      return { isValid: true, warning: 'Non-integer total value', confidenceAdjustment: 0.9 };
    }

    return { isValid: true, confidenceAdjustment: 1.0 };
  }

  private validateSpreadPrediction(value: string, game: GameStats): { isValid: boolean; warning?: string; confidenceAdjustment: number } {
    const spreadMatch = value.match(/^([+-]?\d+(\.\d+)?)$/);
    if (!spreadMatch) {
      return { isValid: false, warning: 'Invalid spread format', confidenceAdjustment: 0.7 };
    }

    const spreadValue = parseFloat(value);
    const absSpread = Math.abs(spreadValue);

    // Check for reasonable spread ranges
    if (absSpread === 0) {
      return { isValid: false, warning: 'Zero spread value', confidenceAdjustment: 0.7 };
    }
    if (absSpread > 2.5) {
      return { isValid: true, warning: 'Large spread for baseball', confidenceAdjustment: 0.85 };
    }
    if (absSpread % 0.5 !== 0) {
      return { isValid: true, warning: 'Unusual spread increment', confidenceAdjustment: 0.9 };
    }

    return { isValid: true, confidenceAdjustment: 1.0 };
  }

  private validateMoneylinePrediction(value: string, game: GameStats): { isValid: boolean; warning?: string; confidenceAdjustment: number } {
    const moneylineMatch = value.match(/^([+-]?\d+)$/);
    if (!moneylineMatch) {
      return { isValid: false, warning: 'Invalid moneyline format', confidenceAdjustment: 0.7 };
    }

    const moneylineValue = parseInt(value);
    const absMoneyline = Math.abs(moneylineValue);

    // Check for reasonable moneyline ranges
    if (absMoneyline < 100) {
      return { isValid: false, warning: 'Moneyline too low', confidenceAdjustment: 0.7 };
    }
    if (absMoneyline > 300) {
      return { isValid: true, warning: 'High risk moneyline value', confidenceAdjustment: 0.8 };
    }
    if (absMoneyline > 200) {
      return { isValid: true, warning: 'Significant underdog/favorite', confidenceAdjustment: 0.9 };
    }

    return { isValid: true, confidenceAdjustment: 1.0 };
  }

  public calculateConfidence(input: PredictionInput): number {
    // Validate prediction value
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

    // Validate prediction value based on type
    let validationResult;
    switch (input.predictionType) {
      case 'TOTAL':
        validationResult = this.validateTotalPrediction(input.predictionValue, input.game);
        break;
      case 'SPREAD':
        validationResult = this.validateSpreadPrediction(input.predictionValue, input.game);
        break;
      case 'MONEYLINE':
        validationResult = this.validateMoneylinePrediction(input.predictionValue, input.game);
        break;
      default:
        validationResult = { isValid: false, warning: 'Invalid prediction type', confidenceAdjustment: 0.7 };
    }

    // Apply validation adjustment
    confidence *= validationResult.confidenceAdjustment;

    // Consider historical accuracy if available
    if (input.historicalAccuracy) {
      const accuracyWeight = Math.min(1, input.historicalAccuracy.sampleSize / 100);
      const historicalAdjustment = 0.7 + (0.3 * input.historicalAccuracy.accuracy);
      confidence = confidence * (1 - accuracyWeight) + (confidence * historicalAdjustment * accuracyWeight);
    }

    // Ensure final confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  public getPredictionQuality(input: PredictionInput): QualityAssessment {
    const confidence = this.calculateConfidence(input);
    let warning: string | undefined;
    let recommendation: 'ACCEPT' | 'REJECT' = 'ACCEPT';

    // Validate prediction value based on type
    let validationResult;
    switch (input.predictionType) {
      case 'TOTAL':
        validationResult = this.validateTotalPrediction(input.predictionValue, input.game);
        break;
      case 'SPREAD':
        validationResult = this.validateSpreadPrediction(input.predictionValue, input.game);
        break;
      case 'MONEYLINE':
        validationResult = this.validateMoneylinePrediction(input.predictionValue, input.game);
        break;
      default:
        validationResult = { isValid: false, warning: 'Invalid prediction type', confidenceAdjustment: 0.7 };
    }

    if (!validationResult.isValid) {
      recommendation = 'REJECT';
      warning = validationResult.warning;
    } else if (validationResult.warning) {
      warning = validationResult.warning;
    }

    // Additional quality checks
    if (confidence < 0.6) {
      recommendation = 'REJECT';
      warning = warning ? `${warning}; Low confidence prediction` : 'Low confidence prediction';
    }

    return {
      confidence,
      warning,
      recommendation
    };
  }
} 