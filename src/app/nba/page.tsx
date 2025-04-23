'use client';

import { useState, useEffect } from 'react';
import { SportsApiService } from '@/lib/sportsApi';
import { Game, Prediction } from '@/models/types';
import GameCard from '@/components/GameCard';
import { FaSpinner, FaFilter, FaSortAmountDown } from "react-icons/fa";

export default function NBAPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const gamesData = await SportsApiService.getUpcomingGames('NBA');
        setGames(gamesData);

        // Fetch predictions for each game
        const predictionsMap: Record<string, Prediction[]> = {};
        
        for (const game of gamesData) {
          const gamePredictions = await SportsApiService.getPredictionsForGame(game.id);
          predictionsMap[game.id] = gamePredictions;
        }
        
        setPredictions(predictionsMap);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch NBA games'));
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
        <p className="text-gray-300">Loading NBA predictions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading NBA Predictions</h1>
        <p className="text-gray-300 mb-4">{error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">NBA Predictions</h1>
        
        <div className="flex space-x-2">
          <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-lg flex items-center">
            <FaFilter className="mr-2" />
            Filter
          </button>
          <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-lg flex items-center">
            <FaSortAmountDown className="mr-2" />
            Sort
          </button>
        </div>
      </div>

      {games.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard 
              key={game.id} 
              game={game} 
              predictions={predictions[game.id]} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <p className="text-xl text-gray-300">No NBA games scheduled currently.</p>
          <p className="text-gray-400 mt-2">Check back later for upcoming games and predictions!</p>
        </div>
      )}
    </div>
  );
} 