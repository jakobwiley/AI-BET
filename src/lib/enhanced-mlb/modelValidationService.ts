import { MLModelService } from './mlModelService.js';
import { EnsembleModel } from './ensembleModel.js';
import { CacheService } from '../cacheService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationConfig {
  minPredictions: number;
  accuracyThreshold: number;
  calibrationThreshold: number;
  driftThreshold: number;
  retrainThreshold: number;
  validationInterval: number; // in milliseconds
}

interface ValidationResult {
  modelId: string;
  accuracy: number;
  calibration: number;
  drift: number;
  needsRetraining: boolean;
  lastValidated: Date;
}

export class ModelValidationService {
  private static readonly DEFAULT_CONFIG: ValidationConfig = {
    minPredictions: 50,
    accuracyThreshold: 0.60,
    calibrationThreshold: 0.70,
    driftThreshold: 0.10,
    retrainThreshold: 0.55,
    validationInterval: 24 * 60 * 60 * 1000 // 24 hours
  };

  private config: ValidationConfig;
  private validationTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...ModelValidationService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Start automatic validation
   */
  public startValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }
    this.validationTimer = setInterval(() => this.validateAllModels(), this.config.validationInterval);
  }

  /**
   * Stop automatic validation
   */
  public stopValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }
  }

  /**
   * Validate all models
   */
  private async validateAllModels(): Promise<void> {
    try {
      const models = await MLModelService.getAllModels();
      for (const model of models) {
        const result = await this.validateModel(model.id);
        await this.logValidationResult(result);
        if (result.needsRetraining) {
          await this.triggerRetraining(model.id);
        }
      }
    } catch (error) {
      console.error('Error validating models:', error);
    }
  }

  /**
   * Validate a single model
   */
  private async validateModel(modelId: string): Promise<ValidationResult> {
    const performance = await MLModelService.getModelPerformance(modelId);
    const recentPerformance = await this.getRecentPerformance(modelId);

    // Calculate metrics
    const accuracy = performance.accuracy;
    const calibration = this.calculateCalibration(performance.confidenceCalibration);
    const drift = this.calculateDrift(performance, recentPerformance);

    // Determine if retraining is needed
    const needsRetraining = 
      performance.totalPredictions >= this.config.minPredictions &&
      (accuracy < this.config.accuracyThreshold ||
       calibration < this.config.calibrationThreshold ||
       drift > this.config.driftThreshold ||
       accuracy < this.config.retrainThreshold);

    return {
      modelId,
      accuracy,
      calibration,
      drift,
      needsRetraining,
      lastValidated: new Date()
    };
  }

  /**
   * Get recent performance for drift calculation
   */
  private async getRecentPerformance(modelId: string): Promise<any> {
    const cacheKey = `recent_performance_${modelId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const recentPredictions = await prisma.prediction.findMany({
      where: {
        modelId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    const performance = this.calculatePerformance(recentPredictions);
    await CacheService.set(cacheKey, performance, 3600); // Cache for 1 hour
    return performance;
  }

  /**
   * Calculate calibration score
   */
  private calculateCalibration(confidenceCalibration: any): number {
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
   * Calculate drift between current and recent performance
   */
  private calculateDrift(current: any, recent: any): number {
    return Math.abs(current.accuracy - recent.accuracy);
  }

  /**
   * Calculate performance from predictions
   */
  private calculatePerformance(predictions: any[]): any {
    const total = predictions.length;
    const correct = predictions.filter(p => p.outcome === 'WIN').length;
    const accuracy = total > 0 ? correct / total : 0;

    const confidenceCalibration: { [range: string]: { accuracy: number; total: number } } = {};
    for (const prediction of predictions) {
      const range = this.getConfidenceRange(prediction.confidence);
      if (!confidenceCalibration[range]) {
        confidenceCalibration[range] = { accuracy: 0, total: 0 };
      }
      confidenceCalibration[range].total++;
      if (prediction.outcome === 'WIN') {
        confidenceCalibration[range].accuracy++;
      }
    }

    for (const range of Object.keys(confidenceCalibration)) {
      confidenceCalibration[range].accuracy /= confidenceCalibration[range].total;
    }

    return { accuracy, confidenceCalibration };
  }

  /**
   * Get confidence range for calibration
   */
  private getConfidenceRange(confidence: number): string {
    const range = Math.floor(confidence / 10) * 10;
    return `${range}-${range + 9}`;
  }

  /**
   * Get expected confidence for a range
   */
  private getExpectedConfidence(range: string): number {
    const [min, max] = range.split('-').map(Number);
    return (min + max) / 200; // Convert to 0-1 scale
  }

  /**
   * Log validation result
   */
  private async logValidationResult(result: ValidationResult): Promise<void> {
    await prisma.modelValidation.create({
      data: {
        modelId: result.modelId,
        accuracy: result.accuracy,
        calibration: result.calibration,
        drift: result.drift,
        needsRetraining: result.needsRetraining,
        validatedAt: result.lastValidated
      }
    });
  }

  /**
   * Trigger model retraining
   */
  private async triggerRetraining(modelId: string): Promise<void> {
    console.log(`Triggering retraining for model ${modelId}`);
    // TODO: Implement actual retraining logic
    // This could involve:
    // 1. Collecting new training data
    // 2. Retraining the model
    // 3. Validating the new model
    // 4. Replacing the old model if the new one is better
  }
}

/**
 * Model validation and retraining:
 * - Automatically validates model performance on a schedule
 * - Triggers retraining if performance drops below thresholds
 * - Logs validation results for transparency
 * - Integrates with MLModelService and EnsembleModel
 */ 