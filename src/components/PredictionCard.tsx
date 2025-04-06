'use client';

import React from 'react';
import { Prediction } from '@/models/types';

interface PredictionCardProps {
  prediction: Prediction;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  // Format prediction for display
  const formatPrediction = () => {
    switch (prediction.predictionType) {
      case 'SPREAD':
        return `${prediction.predictionValue >= 0 ? '+' : ''}${prediction.predictionValue}`;
      case 'MONEYLINE':
        return prediction.predictionValue === 'HOME' ? 'Home Win' : 
               prediction.predictionValue === 'AWAY' ? 'Away Win' : prediction.predictionValue;
      case 'TOTAL':
        return `${prediction.predictionValue}`;
      case 'OVER_UNDER':
        return prediction.predictionValue;
      default:
        return prediction.predictionValue;
    }
  };
  
  // Get type label
  const getTypeLabel = () => {
    switch (prediction.predictionType) {
      case 'SPREAD':
        return 'Spread';
      case 'MONEYLINE':
        return 'Moneyline';
      case 'TOTAL':
        return 'Total Points';
      case 'OVER_UNDER':
        return 'Over/Under';
      default:
        return prediction.predictionType;
    }
  };
  
  // Get confidence color classes
  const getConfidenceClasses = () => {
    const confidence = prediction.confidence || 0;
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-blue-100 text-blue-800';
    if (confidence >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <h3 className="font-medium">{getTypeLabel()}</h3>
      </div>
      
      <div className="p-4">
        <div className="text-2xl font-bold mb-2">
          {formatPrediction()}
        </div>
        
        <div className="mb-3">
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceClasses()}`}>
            {prediction.confidence ? `${prediction.confidence}% Confidence` : 'No confidence score'}
          </span>
        </div>
        
        {prediction.reasoning && (
          <div className="text-sm text-gray-600 mt-3">
            <div className="font-medium mb-1">Reasoning:</div>
            <p>{prediction.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionCard; 