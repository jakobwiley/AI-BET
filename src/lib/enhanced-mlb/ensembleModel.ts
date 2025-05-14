import { Game, Prediction, PredictionType } from '../../models/types.js';
import { MLModelService } from './mlModelService.js';
import { CacheService } from '../cacheService.js';

interface ModelPrediction {
  modelId: string;
  prediction: Prediction;
  weight: number;
  performance: {
    accuracy: number;
    totalPredictions: number;
    lastUpdated: string;
    confidenceCalibration: {
      [range: string]: {
        accuracy: number;
        total: number;
      };
    };
  };
}

interface EnsembleConfig {
  minModels: number;
  maxModels: number;
  confidenceThreshold: number;
  performanceWeight: number;
  calibrationWeight: number;
  recencyWeight: number;
  strategy?: 'weighted' | 'majority' | 'stacking';
}

export class EnsembleModel {
  private static readonly DEFAULT_CONFIG: EnsembleConfig = {
    minModels: 3,
    maxModels: 5,
    confidenceThreshold: 0.65,
    performanceWeight: 0.4,
    calibrationWeight: 0.3,
    recencyWeight: 0.3,
    strategy: 'weighted'
  };

  private config: EnsembleConfig;

  constructor(config: Partial<EnsembleConfig> = {}) {
    this.config = { ...EnsembleModel.DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate ensemble prediction using selected strategy
   */
  public async generatePrediction(
    game: Game,
    predictions: Prediction[]
  ): Promise<Prediction> {
    if (predictions.length < this.config.minModels) {
      throw new Error(`Insufficient models for ensemble (minimum ${this.config.minModels} required)`);
    }

    // Get model performances and calculate weights
    const modelPredictions = await this.getModelPredictions(predictions);
    const weights = this.calculateModelWeights(modelPredictions);

    let ensemblePrediction: Prediction;
    switch (this.config.strategy) {
      case 'majority':
        ensemblePrediction = await this.applyMajorityVoting(game, modelPredictions);
        break;
      case 'stacking':
        ensemblePrediction = await this.applyStacking(game, modelPredictions);
        break;
      case 'weighted':
      default:
        ensemblePrediction = await this.applyWeightedVoting(game, modelPredictions, weights);
        break;
    }

    // Validate ensemble prediction
    if (ensemblePrediction.confidence < this.config.confidenceThreshold * 100) {
      throw new Error('Ensemble confidence below threshold');
    }

    return ensemblePrediction;
  }

  /**
   * Get model predictions with their performance metrics
   */
  private async getModelPredictions(predictions: Prediction[]): Promise<ModelPrediction[]> {
    const modelPredictions: ModelPrediction[] = [];

    for (const prediction of predictions) {
      const modelId = MLModelService.getModelIdFromPrediction(prediction);
      const performance = await MLModelService.getModelPerformance(modelId);

      modelPredictions.push({
        modelId,
        prediction,
        weight: 0, // Will be calculated later
        performance: {
          accuracy: performance.accuracy,
          totalPredictions: performance.totalPredictions,
          lastUpdated: performance.lastUpdated,
          confidenceCalibration: performance.confidenceCalibration
        }
      });
    }

    return modelPredictions;
  }

  /**
   * Calculate model weights based on performance metrics
   */
  private calculateModelWeights(modelPredictions: ModelPrediction[]): Map<string, number> {
    const weights = new Map<string, number>();

    for (const model of modelPredictions) {
      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(model);
      // Calculate calibration score
      const calibrationScore = this.calculateCalibrationScore(model);
      // Calculate recency score
      const recencyScore = this.calculateRecencyScore(model);
      // Combine scores with weights
      const totalScore = 
        performanceScore * this.config.performanceWeight +
        calibrationScore * this.config.calibrationWeight +
        recencyScore * this.config.recencyWeight;
      weights.set(model.modelId, totalScore);
    }

    // Normalize weights
    const totalWeight = Array.from(weights.values()).reduce((sum, weight) => sum + weight, 0);
    for (const [modelId, weight] of weights.entries()) {
      weights.set(modelId, weight / totalWeight);
    }

    return weights;
  }

  /**
   * Calculate performance score based on accuracy and sample size
   */
  private calculatePerformanceScore(model: ModelPrediction): number {
    const { accuracy, totalPredictions } = model.performance;
    const sampleSizeFactor = Math.min(1, totalPredictions / 100); // Cap at 100 predictions
    return accuracy * sampleSizeFactor;
  }

  /**
   * Calculate calibration score based on confidence calibration
   */
  private calculateCalibrationScore(model: ModelPrediction): number {
    const { confidenceCalibration } = model.performance;
    let totalError = 0;
    let totalSamples = 0;

    for (const [range, data] of Object.entries(confidenceCalibration)) {
      if (data.total > 0) {
        const expectedConfidence = this.getExpectedConfidence(range);
        const error = Math.abs(data.accuracy - expectedConfidence);
        totalError += error * data.total;
        totalSamples += data.total;
      }
    }

    return totalSamples > 0 ? 1 - (totalError / totalSamples) : 0;
  }

  /**
   * Calculate recency score based on last update time
   */
  private calculateRecencyScore(model: ModelPrediction): number {
    const lastUpdated = new Date(model.performance.lastUpdated);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (daysSinceUpdate / 30)); // Decay over 30 days
  }

  /**
   * Weighted voting (default, most robust)
   */
  private async applyWeightedVoting(
    game: Game,
    modelPredictions: ModelPrediction[],
    weights: Map<string, number>
  ): Promise<Prediction> {
    let homeVotes = 0;
    let awayVotes = 0;
    let weightedConfidence = 0;
    let totalWeight = 0;

    for (const model of modelPredictions) {
      const weight = weights.get(model.modelId) || 0;
      totalWeight += weight;
      if (model.prediction.predictionValue === 'HOME') {
        homeVotes += weight;
      } else {
        awayVotes += weight;
      }
      weightedConfidence += model.prediction.confidence * weight;
    }

    const predictionValue = homeVotes > awayVotes ? 'HOME' : 'AWAY';
    const confidence = Math.round(weightedConfidence / totalWeight);

    return {
      id: `${game.id}-ensemble`,
      gameId: game.id,
      predictionType: modelPredictions[0].prediction.predictionType,
      predictionValue,
      confidence,
      grade: this.calculateGrade(confidence / 100),
      reasoning: this.generateEnsembleReasoning(modelPredictions, weights),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Simple majority voting (unweighted)
   */
  private async applyMajorityVoting(
    game: Game,
    modelPredictions: ModelPrediction[]
  ): Promise<Prediction> {
    let homeVotes = 0;
    let awayVotes = 0;
    let totalConfidence = 0;

    for (const model of modelPredictions) {
      if (model.prediction.predictionValue === 'HOME') {
        homeVotes++;
      } else {
        awayVotes++;
      }
      totalConfidence += model.prediction.confidence;
    }

    const predictionValue = homeVotes > awayVotes ? 'HOME' : 'AWAY';
    const confidence = Math.round(totalConfidence / modelPredictions.length);

    return {
      id: `${game.id}-ensemble-majority`,
      gameId: game.id,
      predictionType: modelPredictions[0].prediction.predictionType,
      predictionValue,
      confidence,
      grade: this.calculateGrade(confidence / 100),
      reasoning: 'Majority voting ensemble',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Stacking (meta-model placeholder)
   * In a real system, this would use a trained ML model to combine predictions.
   * Here, we simulate with a simple meta-rule: trust the model with the highest performance.
   */
  private async applyStacking(
    game: Game,
    modelPredictions: ModelPrediction[]
  ): Promise<Prediction> {
    // Find the model with the highest accuracy
    const bestModel = modelPredictions.reduce((a, b) =>
      a.performance.accuracy > b.performance.accuracy ? a : b
    );
    // Use its prediction, but lower confidence to reflect meta-uncertainty
    return {
      ...bestModel.prediction,
      id: `${game.id}-ensemble-stacking`,
      confidence: Math.round(bestModel.prediction.confidence * 0.95),
      grade: this.calculateGrade((bestModel.prediction.confidence * 0.95) / 100),
      reasoning: `Stacking ensemble (best model: ${bestModel.modelId})`,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate detailed reasoning for ensemble prediction
   */
  private generateEnsembleReasoning(
    modelPredictions: ModelPrediction[],
    weights: Map<string, number>
  ): string {
    const topModels = modelPredictions
      .sort((a, b) => (weights.get(b.modelId) || 0) - (weights.get(a.modelId) || 0))
      .slice(0, 3);

    return `Ensemble prediction combining ${modelPredictions.length} models. ` +
      `Top contributing models: ${topModels.map(m => m.modelId).join(', ')}. ` +
      `Confidence weighted by model performance, calibration, and recency.`;
  }

  /**
   * Calculate grade based on confidence
   */
  private calculateGrade(confidence: number): string {
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

  /**
   * Get expected confidence for a given range
   */
  private getExpectedConfidence(range: string): number {
    const [min, max] = range.split('-').map(Number);
    return (min + max) / 200; // Convert to 0-1 scale
  }
}

/**
 * Ensemble strategies:
 * - 'weighted': Default, robust to model drift, uses model performance, calibration, and recency.
 * - 'majority': Simple, good for diverse models, less robust to poor models.
 * - 'stacking': Meta-model (placeholder here), can be extended to use ML for combining predictions.
 */ 