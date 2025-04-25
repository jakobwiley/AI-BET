import { PredictionType } from '@prisma/client';

export interface GameStats {
  homeTeamName: string;
  awayTeamName: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface PredictionInput {
  predictionType: PredictionType;
  rawConfidence: number;
  predictionValue: string;
  game: GameStats;
}

export interface CalibrationConfig {
  homeAdvantageWeight: number;
  confidenceThreshold: number;
  minConfidence: number;
  maxConfidence: number;
}

export interface QualityAssessment {
  recommendation: string;
  warning?: string;
}

const DEFAULT_CONFIG: CalibrationConfig = {
  homeAdvantageWeight: 0.1,
  confidenceThreshold: 0.7,
  minConfidence: 0.5,
  maxConfidence: 0.95
};

export class EnhancedPredictionModel {
  private config: CalibrationConfig;

  constructor(config: Partial<CalibrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  calculateConfidence(input: PredictionInput): number {
    let confidence = input.rawConfidence;

    // Adjust for home advantage
    if (input.predictionType === 'MONEYLINE' || input.predictionType === 'SPREAD') {
      confidence *= (1 + this.config.homeAdvantageWeight);
    }

    // Ensure confidence stays within bounds
    confidence = Math.max(this.config.minConfidence, Math.min(this.config.maxConfidence, confidence));

    return confidence;
  }

  getPredictionQuality(input: PredictionInput): QualityAssessment {
    const confidence = this.calculateConfidence(input);
    
    if (confidence < this.config.confidenceThreshold) {
      return {
        recommendation: 'SKIP',
        warning: 'Confidence below threshold'
      };
    }

    if (confidence >= 0.9) {
      return {
        recommendation: 'STRONG BET'
      };
    }

    if (confidence >= 0.8) {
      return {
        recommendation: 'MODERATE BET'
      };
    }

    return {
      recommendation: 'WEAK BET',
      warning: 'Consider skipping due to low confidence'
    };
  }
} 