'use client';

import React from 'react';
import { SportType, PlayerProp } from '@/models/types';
import { usePlayerProps } from '@/hooks/useSportsData';
import { SportsDataApiService } from '@/lib/sportsDataApi';

interface PlayerPropsProps {
  gameId: string;
  sport: SportType;
}

const PlayerProps: React.FC<PlayerPropsProps> = ({ gameId, sport }) => {
  const { playerProps, loading, error } = usePlayerProps(gameId, sport);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading player props...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!playerProps || playerProps.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">No player props available for this game yet.</span>
      </div>
    );
  }

  // Group props by player
  const propsByPlayer = playerProps.reduce((acc, prop) => {
    if (!acc[prop.playerName]) {
      acc[prop.playerName] = [];
    }
    acc[prop.playerName].push(prop);
    return acc;
  }, {} as Record<string, PlayerProp[]>);

  // Format prop type for display
  const formatPropType = (propType: string): string => {
    return propType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div>
      {Object.entries(propsByPlayer).map(([playerName, props]) => (
        <div key={playerName} className="bg-white border rounded-lg shadow-sm mb-4 overflow-hidden">
          <div className="flex items-center p-4 border-b bg-gray-50">
            <div className="h-12 w-12 mr-3 overflow-hidden rounded-full">
              <img
                src={SportsDataApiService.getPlayerImageUrl(
                  sport, 
                  props[0].playerId || '', 
                  playerName
                )}
                alt={playerName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=Player';
                }}
              />
            </div>
            <div>
              <h3 className="font-bold text-lg">{playerName}</h3>
              <div className="text-sm text-gray-600">
                {sport === 'NBA' ? 'Basketball' : sport === 'MLB' ? 'Baseball' : sport}
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {props.map((prop, index) => (
                <div key={index} className="border rounded p-3 hover:bg-gray-50 transition">
                  <div className="text-sm text-gray-600 mb-1">{formatPropType(prop.propType)}</div>
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{prop.overUnderValue}</div>
                    <div className={`text-xs font-bold px-2 py-1 rounded ${
                      prop.predictionValue === 'OVER' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {prop.predictionValue}
                    </div>
                  </div>
                  {prop.confidence && (
                    <div className="mt-2 text-xs text-gray-500">
                      Confidence: {prop.confidence}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlayerProps; 