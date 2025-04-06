'use client';

import { motion } from 'framer-motion';
import { PlayerProp } from '@/models/types';

interface PlayerPropCardProps {
  playerProp: PlayerProp;
}

const PlayerPropCard = ({ playerProp }: PlayerPropCardProps) => {
  // Function to format the confidence as a percentage
  const formatConfidence = (confidence: number | undefined) => {
    if (!confidence) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  // Function to determine the confidence indicator color
  const getConfidenceColor = (confidence: number | undefined) => {
    if (!confidence) return 'bg-gray-500';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Format prop type for display
  const formatPropType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-4 p-4"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-lg">{playerProp.playerName}</h3>
          <p className="text-gray-400 text-xs capitalize">
            {formatPropType(playerProp.propType)}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-xs">Confidence</span>
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${getConfidenceColor(playerProp.confidence)}`}></span>
            <span className="text-white font-bold">
              {formatConfidence(playerProp.confidence)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-3 mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-300">Line</span>
          <span className="text-white font-medium">{playerProp.overUnderValue}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Prediction</span>
          <span className="text-blue-400 font-medium">{playerProp.predictionValue}</span>
        </div>
      </div>
      
      {playerProp.reasoning && (
        <div>
          <h4 className="text-gray-300 text-sm mb-1">Reasoning</h4>
          <p className="text-gray-400 text-sm">{playerProp.reasoning}</p>
        </div>
      )}
      
      {playerProp.outcome && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Outcome</span>
            <span className={`font-medium ${
              playerProp.outcome === 'WIN' ? 'text-green-500' : 
              playerProp.outcome === 'LOSS' ? 'text-red-500' : 
              'text-yellow-500'
            }`}>
              {playerProp.outcome}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PlayerPropCard; 