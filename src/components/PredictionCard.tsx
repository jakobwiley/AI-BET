'use client';

import React from 'react';
import { Prediction } from '@/models/types';

interface PredictionCardProps {
  prediction: Prediction;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  // Get type label
  const getTypeLabel = () => {
    switch (prediction.predictionType) {
      case 'SPREAD':
        return 'Spread';
      case 'MONEYLINE':
        return 'Moneyline';
      case 'TOTAL':
        return 'Total';
      default:
        return prediction.predictionType;
    }
  };

  // Get confidence color classes
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 70) return 'bg-green-500';
    if (confidence >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format prediction value
  const getPredictionValue = () => {
    if (prediction.predictionType === 'TOTAL') {
      return `O/U ${prediction.predictionValue}`;
    }
    return prediction.predictionValue;
  };

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
        <h3 className="font-medium text-gray-200">{getTypeLabel()}</h3>
      </div>
      
      <div className="p-4">
        <div className="text-2xl font-bold mb-2 text-white">
          {getPredictionValue()}
        </div>
        
        <div className="flex items-center mb-3">
          <span data-testid="confidence-indicator" className={`w-2 h-2 rounded-full mr-1 ${getConfidenceColor(prediction.confidence)}`} />
          <span className="text-white font-bold">
            {`${prediction.confidence}%`}
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