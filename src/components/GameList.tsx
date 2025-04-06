'use client';

import React from 'react';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { SportType } from '@/models/types';
import GameCard from './GameCard';

interface GameListProps {
  sport: SportType;
}

export function GameList({ sport }: GameListProps) {
  const { games, loading, error, lastUpdated } = useUpcomingGames(sport);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading games...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!games.length) {
    return (
      <div className="text-center py-8 bg-gray-800 rounded-lg">
        <span className="text-gray-400">No upcoming games found</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          {sport === 'NBA' ? 'NBA Games' : 'MLB Games'}
        </h2>
        {lastUpdated && (
          <div className="text-sm text-gray-400">
            Last updated: {format(lastUpdated, 'h:mm:ss a')}
          </div>
        )}
      </div>
      <div className="grid gap-4">
        {games.map((game) => (
          <GameCard 
            key={game.id} 
            game={game}
            predictions={game.predictions || []}
          />
        ))}
      </div>
    </div>
  );
}

export default GameList; 