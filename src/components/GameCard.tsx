'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Game, Prediction } from '@/models/types';
import { formatDate, formatPredictionType } from '@/utils/formatting';

interface GameCardProps {
  game: Game | null;
  loading?: boolean;
  predictions?: Prediction[];
}

const GameCard: React.FC<GameCardProps> = React.memo(({ game, loading = false, predictions }) => {
  if (loading || !game) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-200">
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-700 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = formatDate(game.gameDate);
  const gamePredictions = predictions || game.predictions || [];

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 70) return 'bg-green-500';
    if (confidence >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const formatPredictionValue = (prediction: Prediction): string => {
    switch (prediction.predictionType) {
      case 'SPREAD':
        return `${prediction.predictionValue > 0 ? '+' : ''}${prediction.predictionValue}`;
      case 'MONEYLINE':
        return `${prediction.predictionValue > 0 ? '+' : ''}${prediction.predictionValue}`;
      case 'TOTAL':
        return `O/U ${prediction.predictionValue}`;
      default:
        return prediction.predictionValue.toString();
    }
  };

  const getPredictionByType = (type: 'SPREAD' | 'MONEYLINE' | 'TOTAL'): Prediction | undefined => {
    return gamePredictions.find(p => p.predictionType === type);
  };

  const spreadPrediction = getPredictionByType('SPREAD');
  const moneylinePrediction = getPredictionByType('MONEYLINE');
  const totalPrediction = getPredictionByType('TOTAL');

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-200">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold text-white" data-testid="game-teams">
          {`${game.homeTeamName} vs ${game.awayTeamName}`}
        </div>
        <div className="text-sm text-gray-400">{formattedDate}</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        {/* Spread */}
        <div className="flex flex-col space-y-2">
          <span className="text-gray-400 text-sm">Spread</span>
          {spreadPrediction && (
            <>
              <span className="text-white font-medium">{formatPredictionValue(spreadPrediction)}</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(spreadPrediction.confidence)}`} />
                <span className="text-white">{spreadPrediction.confidence}%</span>
                <span className={`ml-2 px-2 py-0.5 text-xs text-white rounded-full ${getGradeColor(spreadPrediction.grade)}`}>
                  {spreadPrediction.grade}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Moneyline */}
        <div className="flex flex-col space-y-2">
          <span className="text-gray-400 text-sm">Moneyline</span>
          {moneylinePrediction && (
            <>
              <span className="text-white font-medium">{formatPredictionValue(moneylinePrediction)}</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(moneylinePrediction.confidence)}`} />
                <span className="text-white">{moneylinePrediction.confidence}%</span>
                <span className={`ml-2 px-2 py-0.5 text-xs text-white rounded-full ${getGradeColor(moneylinePrediction.grade)}`}>
                  {moneylinePrediction.grade}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Total */}
        <div className="flex flex-col space-y-2">
          <span className="text-gray-400 text-sm">Total</span>
          {totalPrediction && (
            <>
              <span className="text-white font-medium">{formatPredictionValue(totalPrediction)}</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(totalPrediction.confidence)}`} />
                <span className="text-white">{totalPrediction.confidence}%</span>
                <span className={`ml-2 px-2 py-0.5 text-xs text-white rounded-full ${getGradeColor(totalPrediction.grade)}`}>
                  {totalPrediction.grade}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link 
          href={`/games/${game.id.replace(/^(nba|mlb)-game-/, '')}`} 
          className="text-blue-500 hover:text-blue-400 text-sm"
        >
          View All Predictions
        </Link>
      </div>
    </div>
  );
});

GameCard.displayName = 'GameCard';

export default GameCard;