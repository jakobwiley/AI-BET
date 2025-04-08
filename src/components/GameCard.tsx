'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Game, Prediction } from '@/models/types';
import { formatDate } from '@/utils/formatting';

interface GameCardProps {
  game: Game | null;
  predictions?: Prediction[];
  loading?: boolean;
}

const GameCard: React.FC<GameCardProps> = React.memo(({ game, predictions = [], loading = false }) => {
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
  const topPrediction = predictions.length > 0 ? predictions.reduce((prev, current) => 
    (current.confidence > prev.confidence) ? current : prev, predictions[0]
  ) : null;

  const spreadValue = typeof game.spread === 'number' ? game.spread : 
    (game.spread?.home ? game.spread.home : undefined);

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-200">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold text-white" data-testid="game-teams">
          {`${game.homeTeamName} vs ${game.awayTeamName}`}
        </div>
      </div>
      <div className="text-sm text-gray-400 mb-4">{formattedDate}</div>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Home</span>
          <span className="text-gray-300" data-testid="home-team">{game.homeTeamName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Away</span>
          <span className="text-gray-300" data-testid="away-team">{game.awayTeamName}</span>
        </div>
        {spreadValue !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Spread</span>
            <span className="text-gray-300" data-testid="spread-value">{spreadValue}</span>
          </div>
        )}
        {topPrediction && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm font-medium text-gray-400 mb-2">
              Top Prediction
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300" data-testid="prediction-value">
                {topPrediction.predictionValue}
              </span>
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    topPrediction.confidence >= 70 ? 'bg-green-500' :
                    topPrediction.confidence >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  data-testid="confidence-indicator"
                />
                <span className="text-gray-400">
                  {Math.round(topPrediction.confidence)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      <Link href={`/games/${game.id}`} passHref legacyBehavior>
        <a className="block mt-4 text-center text-blue-500 hover:text-blue-400 text-sm">
          View All Predictions
        </a>
      </Link>
    </div>
  );
});

GameCard.displayName = 'GameCard';

export default GameCard;