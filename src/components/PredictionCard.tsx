import { Prediction } from '@/models/types';
import { motion } from 'framer-motion';

interface PredictionCardProps {
  prediction: Prediction;
}

const PredictionCard = ({ prediction }: PredictionCardProps) => {
  // Function to format the confidence as a percentage
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Function to determine the confidence indicator color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format prediction type for display
  const formatPredictionType = (type: string) => {
    switch (type) {
      case 'SPREAD':
        return 'Point Spread';
      case 'MONEYLINE':
        return 'Moneyline';
      case 'OVER_UNDER':
        return 'Over/Under';
      default:
        return type.replace('_', ' ').toLowerCase();
    }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-4 p-4"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{formatPredictionType(prediction.predictionType)}</h3>
          <p className="text-blue-400 text-lg font-medium">
            {prediction.predictionValue}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-xs">Confidence</span>
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${getConfidenceColor(prediction.confidence)}`}></span>
            <span className="text-white font-bold">
              {formatConfidence(prediction.confidence)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-3 mb-3">
        <h4 className="text-gray-300 text-sm mb-1">Reasoning</h4>
        <p className="text-gray-200 text-sm">{prediction.reasoning}</p>
      </div>
      
      {prediction.outcome && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Outcome</span>
            <span className={`font-medium ${
              prediction.outcome === 'WIN' ? 'text-green-500' : 
              prediction.outcome === 'LOSS' ? 'text-red-500' : 
              'text-yellow-500'
            }`}>
              {prediction.outcome}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PredictionCard; 