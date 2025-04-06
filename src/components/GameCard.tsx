'use client';

import { FaArrowRight, FaBasketballBall, FaBaseballBall } from 'react-icons/fa';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Game, Prediction } from '@/models/types';

interface GameCardProps {
  game: Game;
  predictions?: Prediction[];
}

const GameCard = ({ game, predictions }: GameCardProps) => {
  // Find the highest confidence prediction
  const highestConfidencePrediction = predictions?.reduce((prev, current) => {
    return (prev?.confidence || 0) > (current?.confidence || 0) ? prev : current;
  }, predictions[0]);

  // Function to format the confidence as a percentage
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence)}%`;
  };

  // Function to determine the confidence indicator color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get the appropriate sport icon
  const SportIcon = game.sport === 'NBA' ? FaBasketballBall : FaBaseballBall;

  // Format date
  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };
    return dateObj.toLocaleDateString('en-US', options);
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-4"
    >
      <div className="p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <SportIcon className="text-blue-500 mr-2" />
            <span className="text-gray-400 text-sm">
              {formatDate(game.gameDate)}
            </span>
          </div>
          <span className="bg-gray-700 text-xs px-2 py-1 rounded-full text-gray-300">
            {game.status}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg">{game.homeTeamName}</span>
            <span className="text-gray-400 text-xs">Home</span>
          </div>
          <span className="text-gray-500 font-bold">vs</span>
          <div className="flex flex-col items-end">
            <span className="text-white font-bold text-lg">{game.awayTeamName}</span>
            <span className="text-gray-400 text-xs">Away</span>
          </div>
        </div>
        
        {highestConfidencePrediction && (
          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-400 text-xs">Top Prediction</span>
                <div className="text-white font-medium">
                  {highestConfidencePrediction.predictionValue}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-gray-400 text-xs">Confidence</span>
                <div className="flex items-center">
                  <span 
                    data-testid="confidence-indicator"
                    className={`w-2 h-2 rounded-full mr-1 ${getConfidenceColor(highestConfidencePrediction.confidence || 0)}`}
                  />
                  <span className="text-white font-bold">
                    {formatConfidence(highestConfidencePrediction.confidence || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Link href={`/games/${game.id}`} className="mt-3 pt-3 flex justify-center items-center text-blue-500 text-sm hover:text-blue-400 border-t border-gray-700">
          View All Predictions
          <FaArrowRight className="ml-1" size={12} />
        </Link>
      </div>
    </motion.div>
  );
};

export default GameCard; 