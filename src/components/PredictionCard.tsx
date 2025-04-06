'use client';

import React from 'react';
import { Prediction } from '@/models/types';
import { motion } from 'framer-motion';

interface PredictionCardProps {
  prediction: Prediction;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  // Format prediction for display
  const formatPrediction = () => {
    switch (prediction.predictionType) {
      case 'SPREAD':
        const value = typeof prediction.predictionValue === 'number' 
          ? prediction.predictionValue 
          : parseFloat(prediction.predictionValue);
        return `${value >= 0 ? '+' : ''}${value}`;
      case 'MONEYLINE':
        const mlValue = typeof prediction.predictionValue === 'number'
          ? (prediction.predictionValue >= 0 ? '+' : '') + prediction.predictionValue
          : prediction.predictionValue;
        return mlValue;
      case 'TOTAL':
        return `O/U ${prediction.predictionValue}`;
      case 'OVER_UNDER':
        return prediction.predictionValue;
      default:
        return prediction.predictionValue.toString();
    }
  };
  
  // Get type label
  const getTypeLabel = () => {
    switch (prediction.predictionType) {
      case 'SPREAD':
        return 'Point Spread';
      case 'MONEYLINE':
        return 'Money Line';
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
    if (confidence >= 80) return 'bg-green-500 text-white';
    if (confidence >= 60) return 'bg-blue-500 text-white';
    if (confidence >= 40) return 'bg-yellow-500 text-white';
    return 'bg-gray-500 text-white';
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg"
    >
      <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
        <h3 className="font-medium text-gray-200">{getTypeLabel()}</h3>
      </div>
      
      <div className="p-4">
        <div className="text-2xl font-bold mb-2 text-white">
          {formatPrediction()}
        </div>
        
        <div className="mb-3">
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceClasses()}`}>
            {prediction.confidence ? `${Math.round(prediction.confidence * 100)}% Confidence` : 'No confidence score'}
          </span>
        </div>
        
        {prediction.reasoning && (
          <div className="text-sm text-gray-300 mt-3">
            <div className="font-medium mb-1">Reasoning:</div>
            <p>{prediction.reasoning}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PredictionCard; 