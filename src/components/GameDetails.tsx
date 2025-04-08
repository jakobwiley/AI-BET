'use client';

import React, { useState } from 'react';
import { Game, Prediction } from '@/models/types';
import PredictionCard from './PredictionCard';
import GameStats from './GameStats';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

interface GameDetailsProps {
  game?: Game;
  initialPredictions?: Prediction[];
  isLoading?: boolean;
}

export default function GameDetails({ game, initialPredictions = [], isLoading = false }: GameDetailsProps) {
  const [activeTab, setActiveTab] = useState<'predictions' | 'stats'>('predictions');

  if (isLoading) {
    return (
      <div className="animate-pulse" data-testid="loading-skeleton">
        <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!game) {
    return <div className="text-center text-gray-500">Game not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-card p-4 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">
          {game.homeTeamName} vs {game.awayTeamName}
        </h1>
        <p className="text-muted-foreground">{formatDate(game.gameDate)}</p>
        <p className="text-muted-foreground">{game.status}</p>
      </div>

      <div className="flex space-x-4">
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'predictions'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
          onClick={() => setActiveTab('predictions')}
        >
          Predictions
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'stats'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </div>

      {activeTab === 'predictions' && (
        <div className="space-y-4">
          {initialPredictions.length > 0 ? (
            initialPredictions.map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))
          ) : (
            <p className="text-muted-foreground">No predictions available.</p>
          )}
        </div>
      )}

      {activeTab === 'stats' && <GameStats game={game} />}
    </div>
  );
} 