'use client';

import { Prediction } from '@/models/types';
import { formatConfidence, formatPredictionType, getConfidenceColor } from '@/utils/formatting';
import { motion } from 'framer-motion';

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const confidenceColor = getConfidenceColor(prediction.confidence);
  const formattedConfidence = formatConfidence(prediction.confidence);
  const formattedType = formatPredictionType(prediction.predictionType);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-4 p-4"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{formattedType}</h3>
          <p className="text-blue-400 text-lg font-medium">{prediction.predictionValue}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-xs">Confidence</span>
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${confidenceColor.replace('text', 'bg')}`}></span>
            <span className="text-white font-bold">{formattedConfidence}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-3 mb-3">
        <h4 className="text-gray-300 text-sm mb-1">Reasoning</h4>
        <p className="text-gray-200 text-sm">{prediction.reasoning}</p>
      </div>
    </motion.div>
  );
} 