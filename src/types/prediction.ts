import { PredictionType, PredictionOutcome } from '@prisma/client';

// REMOVE or RENAME this interface to avoid conflict with Prisma's Prediction type
// export interface Prediction { ... }

export interface Prediction {
  id?: string;
  gameId: string;
  type: PredictionType;
  predictionValue: string;
  confidence: number;
  reasoning: string;
  outcome?: PredictionOutcome;
  createdAt?: Date;
  updatedAt?: Date;
} 