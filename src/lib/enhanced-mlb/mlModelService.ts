import { Prediction, Game } from '../../models/types.js';
import { PredictionOutcome } from '@prisma/client';
import { CacheService } from '../cacheService.js';

interface ModelPerformance {
  modelId: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  confidenceCalibration: {
    [confidenceRange: string]: {
      total: number;
      correct: number;
      accuracy: number;
    };
  };
  lastUpdated: string;
}

interface EnsembleWeight {
  modelId: string;
  weight: number;
  lastUpdated: string;
}

interface PredictionResult {
  prediction: Prediction;
  actualOutcome: PredictionOutcome;
  confidenceError: number;
  timestamp: string;
}

export class MLModelService {
  private static readonly CACHE_DURATION = 3600; // 1 hour
  private static readonly CONFIDENCE_RANGES = [
    '50-60', '60-70', '70-80', '80-90', '90-100'
  ];

  /**
   * Track prediction result and update model performance
   */
  static async trackPredictionResult(
    prediction: Prediction,
    actualOutcome: PredictionOutcome
  ): Promise<void> {
    try {
      const modelId = this.getModelIdFromPrediction(prediction);
      const performance = await this.getModelPerformance(modelId);
      const confidenceError = this.calculateConfidenceError(prediction, actualOutcome);

      // Update performance metrics
      performance.totalPredictions++;
      if (actualOutcome === 'WIN') {
        performance.correctPredictions++;
      }
      performance.accuracy = performance.correctPredictions / performance.totalPredictions;

      // Update confidence calibration
      const confidenceRange = this.getConfidenceRange(prediction.confidence);
      if (!performance.confidenceCalibration[confidenceRange]) {
        performance.confidenceCalibration[confidenceRange] = {
          total: 0,
          correct: 0,
          accuracy: 0
        };
      }

      const calibration = performance.confidenceCalibration[confidenceRange];
      calibration.total++;
      if (actualOutcome === 'WIN') {
        calibration.correct++;
      }
      calibration.accuracy = calibration.correct / calibration.total;

      performance.lastUpdated = new Date().toISOString();

      // Cache updated performance
      await CacheService.set(
        `model_performance_${modelId}`,
        performance,
        this.CACHE_DURATION
      );

      // Store prediction result for analysis
      await this.storePredictionResult(prediction, actualOutcome, confidenceError);
    } catch (error) {
      console.error('Error tracking prediction result:', error);
    }
  }

  /**
   * Get model performance metrics
   */
  static async getModelPerformance(modelId: string): Promise<ModelPerformance> {
    const cacheKey = `model_performance_${modelId}`;
    const cached = await CacheService.get<ModelPerformance>(cacheKey);
    
    if (cached) return cached;

    // Initialize new performance tracking
    const performance: ModelPerformance = {
      modelId,
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      confidenceCalibration: {},
      lastUpdated: new Date().toISOString()
    };

    await CacheService.set(cacheKey, performance, this.CACHE_DURATION);
    return performance;
  }

  /**
   * Adjust model weights based on performance
   */
  static async adjustModelWeights(): Promise<void> {
    try {
      const models = ['enhanced', 'basic', 'historical', 'situational'];
      const weights: EnsembleWeight[] = [];

      // Get performance for each model
      const performances = await Promise.all(
        models.map(model => this.getModelPerformance(model))
      );

      // Calculate weights based on accuracy and recency
      const totalWeight = performances.reduce((sum, perf) => {
        const recencyFactor = this.calculateRecencyFactor(perf.lastUpdated);
        return sum + (perf.accuracy * recencyFactor);
      }, 0);

      // Normalize weights
      performances.forEach((perf, index) => {
        const recencyFactor = this.calculateRecencyFactor(perf.lastUpdated);
        const weight = (perf.accuracy * recencyFactor) / totalWeight;
        
        weights.push({
          modelId: models[index],
          weight,
          lastUpdated: new Date().toISOString()
        });
      });

      // Cache updated weights
      await CacheService.set(
        'ensemble_weights',
        weights,
        this.CACHE_DURATION
      );
    } catch (error) {
      console.error('Error adjusting model weights:', error);
    }
  }

  /**
   * Get calibrated confidence score
   */
  static async getCalibratedConfidence(
    modelId: string,
    rawConfidence: number
  ): Promise<number> {
    const performance = await this.getModelPerformance(modelId);
    const confidenceRange = this.getConfidenceRange(rawConfidence);
    const calibration = performance.confidenceCalibration[confidenceRange];

    if (!calibration || calibration.total < 10) {
      return rawConfidence; // Not enough data for calibration
    }

    // Adjust confidence based on historical accuracy
    const calibrationFactor = calibration.accuracy / (rawConfidence / 100);
    return Math.min(100, Math.max(50, rawConfidence * calibrationFactor));
  }

  /**
   * Generate ensemble prediction
   */
  static async generateEnsemblePrediction(
    game: Game,
    predictions: Prediction[]
  ): Promise<Prediction> {
    try {
      // Get current ensemble weights
      const weights = await CacheService.get<EnsembleWeight[]>('ensemble_weights');
      if (!weights) {
        throw new Error('Ensemble weights not found');
      }

      // Calculate weighted confidence
      let totalWeight = 0;
      let weightedConfidence = 0;
      let homeVotes = 0;
      let awayVotes = 0;

      predictions.forEach(pred => {
        const modelId = this.getModelIdFromPrediction(pred);
        const weight = weights.find(w => w.modelId === modelId)?.weight || 0;
        
        totalWeight += weight;
        weightedConfidence += pred.confidence * weight;

        if (pred.predictionValue === 'HOME') {
          homeVotes += weight;
        } else {
          awayVotes += weight;
        }
      });

      // Normalize confidence
      const normalizedConfidence = weightedConfidence / totalWeight;
      const predictionValue = homeVotes > awayVotes ? 'HOME' : 'AWAY';

      return {
        id: `${game.id}-ensemble`,
        gameId: game.id,
        predictionType: predictions[0].predictionType,
        predictionValue,
        confidence: Math.round(normalizedConfidence),
        grade: this.calculateGrade(normalizedConfidence / 100),
        reasoning: 'Ensemble prediction combining multiple models',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating ensemble prediction:', error);
      throw error;
    }
  }

  /**
   * Get model ID from prediction
   */
  public static getModelIdFromPrediction(prediction: Prediction): string {
    // Extract model ID from prediction ID or reasoning
    const idParts = prediction.id.split('-');
    return idParts[1] || 'unknown';
  }

  private static calculateConfidenceError(
    prediction: Prediction,
    actualOutcome: PredictionOutcome
  ): number {
    const expectedConfidence = actualOutcome === 'WIN' ? 100 : 0;
    return Math.abs(prediction.confidence - expectedConfidence);
  }

  private static getConfidenceRange(confidence: number): string {
    const range = Math.floor(confidence / 10) * 10;
    return `${range}-${range + 10}`;
  }

  private static calculateRecencyFactor(lastUpdated: string): number {
    const daysSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysSinceUpdate / 30); // Exponential decay over 30 days
  }

  private static calculateGrade(confidence: number): string {
    if (confidence >= 0.85) return 'A+';
    if (confidence >= 0.80) return 'A';
    if (confidence >= 0.75) return 'A-';
    if (confidence >= 0.70) return 'B+';
    if (confidence >= 0.65) return 'B';
    if (confidence >= 0.60) return 'B-';
    if (confidence >= 0.55) return 'C+';
    if (confidence >= 0.50) return 'C';
    return 'C-';
  }

  private static async storePredictionResult(
    prediction: Prediction,
    actualOutcome: PredictionOutcome,
    confidenceError: number
  ): Promise<void> {
    const result: PredictionResult = {
      prediction,
      actualOutcome,
      confidenceError,
      timestamp: new Date().toISOString()
    };

    // Store in cache for analysis
    const results = await CacheService.get<PredictionResult[]>('prediction_results') || [];
    results.push(result);
    await CacheService.set('prediction_results', results, this.CACHE_DURATION);
  }
} 