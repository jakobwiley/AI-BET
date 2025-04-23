'use client';

import { useEffect, useState } from 'react';
import { useGamePredictions } from '@/hooks/useSportsData';
import { useParams } from 'next/navigation';
import GameDetails from '@/components/GameDetails';
import PredictionList from '@/components/PredictionList';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { Prediction } from '@/models/types';

export default function GameDetailsPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { game, predictions: gamePredictions, loading, error } = useGamePredictions(gameId);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (!game) {
    return <ErrorMessage message="Game not found" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <GameDetails game={game} />
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4">Predictions</h2>
        <PredictionList predictions={gamePredictions} />
      </div>
    </div>
  );
} 