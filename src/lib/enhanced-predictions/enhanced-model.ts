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
  predictionType: PredictionType;
  rawConfidence: number;  // Original confidence from base model
  predictionValue: string;
  game: GameStats;
  recentHomeScores?: number[];  // Last 5 games
  recentAwayScores?: number[];  // Last 5 games
  homeTeamWinRate?: number;    // Recent win rate
  awayTeamWinRate?: number;    // Recent win rate
  historicalAccuracy?: {  // New field for historical performance
    type: PredictionType;
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
    [PredictionType.SPREAD]: number;    // 1.1 (best performing)
    [PredictionType.MONEYLINE]: number; // 1.0 (baseline)
    [PredictionType.TOTAL]: number;     // 0.9 (most volatile)
  };
}

const DEFAULT_CONFIG: CalibrationConfig = {
  maxConfidence: 0.82,
  optimalRange: {
    min: 0.70,
    max: 0.80
  },
  typeWeights: {
    [PredictionType.SPREAD]: 1.15,
    [PredictionType.MONEYLINE]: 0.95,
    [PredictionType.TOTAL]: 0.85
  }
};

interface QualityAssessment {
  confidence: number;
  warning?: string;
  recommendation: 'ACCEPT' | 'REJECT';
}

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

  private validateTotalPrediction(value: string, game: GameStats): { isValid: boolean; warning?: string; confidenceAdjustment: number } {
    // Handle both "OVER X" and "o X" formats
    const totalMatch = value.match(/^(OVER|UNDER|O|U|o|u)\s*(\d+(\.\d+)?)$/i);
    if (!totalMatch) {
      return { isValid: false, warning: 'Invalid total format', confidenceAdjustment: 0.7 };
    }

    const totalValue = parseFloat(totalMatch[2]);
    const direction = totalMatch[1].toUpperCase().startsWith('O') ? 'OVER' : 'UNDER';

    // Check for reasonable total range based on sport (assuming baseball for now)
    if (totalValue < 5) {
      return { isValid: true, warning: 'Unusually low total', confidenceAdjustment: 0.75 };
    }
    if (totalValue > 12) {
      return { isValid: true, warning: 'Unusually high total', confidenceAdjustment: 0.8 };
    }

    // Check for half-runs in baseball
    if (totalValue % 0.5 !== 0) {
      return { isValid: true, warning: 'Non-standard total increment', confidenceAdjustment: 0.9 };
    }

    // Analyze recent scoring trends if available
    const homeScore = game.homeScore ?? null;
    const awayScore = game.awayScore ?? null;
    if (homeScore !== null && awayScore !== null) {
      const totalScore = homeScore + awayScore;
      const scoreDiff = Math.abs(totalScore - totalValue);
      
      if (scoreDiff > 5) {
        return { 
          isValid: true, 
          warning: `Large deviation from actual total (${totalScore})`,
          confidenceAdjustment: 0.85
        };
      }
    }

    return { isValid: true, confidenceAdjustment: 1.0 };
  }

  private validateSpreadPrediction(value: string, game: GameStats): { isValid: boolean; warning?: string; confidenceAdjustment: number } {
    // Handle both "+X" and "X" formats
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

    // Baseball-specific spread validation
    if (absSpread > 2.5) {
      const confidenceAdj = Math.max(0.7, 1 - ((absSpread - 2.5) * 0.1));
      return { 
        isValid: true, 
        warning: 'Large spread for baseball',
        confidenceAdjustment: confidenceAdj
      };
    }

    // Check for standard increments (0.5)
    if (absSpread % 0.5 !== 0) {
      return { isValid: true, warning: 'Non-standard spread increment', confidenceAdjustment: 0.9 };
    }

    // If game scores available, validate against actual spread
    const homeScore = game.homeScore ?? null;
    const awayScore = game.awayScore ?? null;
    if (homeScore !== null && awayScore !== null) {
      const actualSpread = homeScore - awayScore;
      const spreadError = Math.abs(actualSpread - spreadValue);
      
      if (spreadError > 3) {
        return {
          isValid: true,
          warning: `Large deviation from actual spread (${actualSpread})`,
          confidenceAdjustment: 0.85
        };
      }
    }

    return { isValid: true, confidenceAdjustment: 1.0 };
  }

  private validateMoneylinePrediction(value: string, game: GameStats): { isValid: boolean; warning?: string; confidenceAdjustment: number } {
    // Handle both numeric and American odds formats
    const moneylineMatch = value.match(/^([+-]?\d+)$/);
    if (!moneylineMatch) {
      return { isValid: false, warning: 'Invalid moneyline format', confidenceAdjustment: 0.7 };
    }

    const moneylineValue = parseInt(value);
    const absMoneyline = Math.abs(moneylineValue);
    const isFavorite = moneylineValue < 0;

    // Basic validation
    if (absMoneyline < 100) {
      return { isValid: false, warning: 'Moneyline too low', confidenceAdjustment: 0.7 };
    }

    // Calculate implied probability
    const impliedProb = isFavorite 
      ? absMoneyline / (absMoneyline + 100)
      : 100 / (absMoneyline + 100);

    // Risk assessment based on implied probability
    if (impliedProb > 0.8) {
      return { 
        isValid: true, 
        warning: 'Heavy favorite (high risk-low reward)',
        confidenceAdjustment: 0.85
      };
    }

    if (impliedProb < 0.2) {
      return {
        isValid: true,
        warning: 'Heavy underdog (high variance)',
        confidenceAdjustment: 0.8
      };
    }

    // Value betting assessment
    if (game.homeTeamWinRate && game.awayTeamWinRate) {
      const expectedWinRate = isFavorite ? game.homeTeamWinRate : game.awayTeamWinRate;
      const probDiff = Math.abs(expectedWinRate - impliedProb);
      
      if (probDiff > 0.15) {
        return {
          isValid: true,
          warning: 'Large discrepancy between odds and expected win rate',
          confidenceAdjustment: 1.1 // Potential value bet
        };
      }
    }

    return { isValid: true, confidenceAdjustment: 1.0 };
  }

  public calculateConfidence(input: PredictionInput): number {
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

  public getPredictionQuality(input: PredictionInput): QualityAssessment {
    let confidence = this.calculateConfidence(input);
    let warning: string | undefined;
    
    // Stricter base confidence adjustments
    if (confidence < 0.65) {
      confidence *= 0.85;
    }

    // Apply historical accuracy adjustment if available
    if (input.historicalAccuracy && input.historicalAccuracy.sampleSize > 10) {
      const historyWeight = Math.min(input.historicalAccuracy.sampleSize / 100, 0.4);
      confidence = confidence * (1 - historyWeight) + input.historicalAccuracy.accuracy * historyWeight;
    }

    // Type-specific validations with enhanced rules
    let validationResult;
    switch (input.predictionType) {
      case PredictionType.TOTAL:
        validationResult = this.validateTotalPrediction(input.predictionValue, input.game);
        confidence *= 0.95;
        break;
      case PredictionType.SPREAD:
        validationResult = this.validateSpreadPrediction(input.predictionValue, input.game);
        if (confidence > 0.75) {
          confidence *= 1.05;
        }
        break;
      case PredictionType.MONEYLINE:
        validationResult = this.validateMoneylinePrediction(input.predictionValue, input.game);
        break;
    }

    if (validationResult) {
      if (!validationResult.isValid) {
        warning = validationResult.warning;
        confidence *= validationResult.confidenceAdjustment;
      } else if (validationResult.warning) {
        warning = validationResult.warning;
        confidence *= validationResult.confidenceAdjustment;
      }
    }

    // Game-specific adjustments
    if (!input.game.homeTeamName || !input.game.awayTeamName) {
      warning = 'Missing team information';
      confidence *= 0.6;
    }

    // Team performance adjustments
    if (input.homeTeamWinRate && input.awayTeamWinRate) {
      const winRateDiff = Math.abs(input.homeTeamWinRate - input.awayTeamWinRate);
      if (winRateDiff > 0.2) {
        confidence *= 1.1; // Boost confidence for significant team mismatches
      }
    }

    // Recent scoring pattern analysis
    if (input.recentHomeScores?.length && input.recentAwayScores?.length) {
      const homeAvg = input.recentHomeScores.reduce((a, b) => a + b, 0) / input.recentHomeScores.length;
      const awayAvg = input.recentAwayScores.reduce((a, b) => a + b, 0) / input.recentAwayScores.length;
      
      if (input.predictionType === PredictionType.TOTAL) {
        const totalVariance = Math.abs((homeAvg + awayAvg) - parseFloat(input.predictionValue.replace(/[^\d.]/g, '')));
        if (totalVariance > 3) {
          warning = warning ? `${warning}; Large deviation from recent scoring` : 'Large deviation from recent scoring';
          confidence *= 0.9;
        }
      }
    }

    // Updated recommendation threshold
    const recommendation = confidence >= 0.65 ? 'ACCEPT' : 'REJECT';

    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      warning,
      recommendation
    };
  }
} 