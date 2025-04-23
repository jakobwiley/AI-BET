import { PredictionType, PredictionOutcome } from '@prisma/client';

export interface Prediction {
  id?: string;
  gameId: string;
  type: PredictionType;
  predictionValue: number;
  confidence: number;
  reasoning: string;
  outcome?: PredictionOutcome;
  createdAt?: Date;
  updatedAt?: Date;
} 