'use client';

import React from 'react';
import { Prediction } from '@/models/types';
import { formatPredictionType } from '@/utils/formatting';

interface PredictionCardProps {
  prediction: Prediction;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  // Format confidence value
  const formatConfidence = (confidence: number | null | undefined): string => {
    if (confidence === null || confidence === undefined) {
      return 'PENDING';
    }
    const clampedConfidence = Math.min(100, Math.max(0, confidence));
    return `${clampedConfidence.toFixed(1)}%`;
  };

  // Get confidence color classes
  const getConfidenceColor = (confidence: number | null | undefined): string => {
    if (confidence === null || confidence === undefined) {
      return 'bg-gray-500'; // Gray for pending
    }
    const clampedConfidence = Math.min(100, Math.max(0, confidence));
    if (clampedConfidence >= 70) return 'bg-green-500';
    if (clampedConfidence >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format prediction value
  const formatPredictionValue = (prediction: Prediction): string => {
    switch (prediction.predictionType) {
      case 'SPREAD':
        return `${prediction.predictionValue > 0 ? '+' : ''}${prediction.predictionValue}`;
      case 'MONEYLINE':
        return `${prediction.predictionValue > 0 ? '+' : ''}${prediction.predictionValue}`;
      case 'TOTAL':
        return `O/U ${prediction.predictionValue}`;
      default:
        return prediction.predictionValue?.toString() || 'N/A';
    }
  };

  // Get grade display
  const getGradeDisplay = (prediction: Prediction): string => {
    return prediction.grade || 'PENDING';
  }

  // Get grade background color
  const getGradeColor = (grade: string | null | undefined): string => {
    if (!grade || grade === 'PENDING') return 'bg-gray-500';
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
        <h3 className="font-medium text-gray-200">{formatPredictionType(prediction.predictionType)}</h3>
      </div>
      
      <div className="p-4">
        <div className="text-2xl font-bold mb-2 text-white">
          {formatPredictionValue(prediction)}
        </div>
        
        <div className="flex items-center mb-3">
          <span data-testid="confidence-indicator" className={`w-2 h-2 rounded-full mr-1 ${getConfidenceColor(prediction.confidence)}`} />
          <span className="text-white font-bold">
            {formatConfidence(prediction.confidence)}
          </span>
          <span className={`ml-2 px-2 py-0.5 text-xs text-white rounded-full ${getGradeColor(prediction.grade)}`}>
            Grade: {getGradeDisplay(prediction)}
          </span>
        </div>
        
        {prediction.reasoning && (
          <div className="text-sm text-gray-300 mt-3">
            <div className="font-medium mb-1">Reasoning:</div>
            <p>{prediction.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionCard; 