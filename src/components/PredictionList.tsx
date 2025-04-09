'use client';

import { Prediction } from '@/models/types';
import PredictionCard from './PredictionCard'; // Import PredictionCard

interface PredictionListProps {
  predictions: Prediction[];
}

export default function PredictionList({ predictions }: PredictionListProps) {
  if (!predictions || predictions.length === 0) { // Added check for predictions potentially being null/undefined
    return (
      <div className="text-gray-500 text-center py-8">
        No predictions available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map predictions to PredictionCard component */}
      {predictions.map((prediction) => (
        <PredictionCard key={prediction.id} prediction={prediction} />
      ))}
    </div>
  );
} 