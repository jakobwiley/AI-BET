'use client';

import { useState, useEffect } from 'react';
import { FaSpinner, FaFilter, FaSortAmountDown } from "react-icons/fa";
import GameCard from '@/components/GameCard';

// Mock data for MLB games
const mockGames = [
  {
    id: 'mlb-game-1',
    sport: 'MLB' as const,
    gameDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Tomorrow
    homeTeamId: 'yankees',
    awayTeamId: 'redsox',
    homeTeamName: 'Yankees',
    awayTeamName: 'Red Sox',
    status: 'SCHEDULED',
  },
  {
    id: 'mlb-game-2',
    sport: 'MLB' as const,
    gameDate: new Date(new Date().getTime() + 48 * 60 * 60 * 1000), // Day after tomorrow
    homeTeamId: 'dodgers',
    awayTeamId: 'giants',
    homeTeamName: 'Dodgers',
    awayTeamName: 'Giants',
    status: 'SCHEDULED',
  },
  {
    id: 'mlb-game-3',
    sport: 'MLB' as const,
    gameDate: new Date(new Date().getTime() + 72 * 60 * 60 * 1000), // 3 days from now
    homeTeamId: 'astros',
    awayTeamId: 'braves',
    homeTeamName: 'Astros',
    awayTeamName: 'Braves',
    status: 'SCHEDULED',
  }
];

// Mock predictions for each game
const mockPredictions = {
  'mlb-game-1': [
    {
      id: 'pred-1',
      gameId: 'mlb-game-1',
      predictionType: 'MONEYLINE',
      predictionValue: 'Yankees Win',
      confidence: 0.76,
      reasoning: 'The Yankees have won 7 of their last 10 home games against the Red Sox.',
      createdAt: new Date()
    },
    {
      id: 'pred-2',
      gameId: 'mlb-game-1',
      predictionType: 'OVER_UNDER',
      predictionValue: 'OVER 8.5',
      confidence: 0.68,
      reasoning: 'Both teams have strong offensive lineups and the weather conditions favor hitting.',
      createdAt: new Date()
    }
  ],
  'mlb-game-2': [
    {
      id: 'pred-3',
      gameId: 'mlb-game-2',
      predictionType: 'SPREAD',
      predictionValue: 'Dodgers -1.5',
      confidence: 0.71,
      reasoning: 'The Dodgers have been dominant at home this season, winning by multiple runs.',
      createdAt: new Date()
    }
  ],
  'mlb-game-3': [
    {
      id: 'pred-4',
      gameId: 'mlb-game-3',
      predictionType: 'MONEYLINE',
      predictionValue: 'Braves Win',
      confidence: 0.64,
      reasoning: 'The Braves have a stronger starting pitcher scheduled and have been hitting well on the road.',
      createdAt: new Date()
    }
  ]
};

export default function MLBPage() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // Simulate API loading
    const loadData = async () => {
      // Wait 1 second to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGames(mockGames);
      setPredictions(mockPredictions);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
        <p className="text-gray-300">Loading MLB predictions...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">MLB Predictions</h1>
        
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <GameCard 
            key={game.id} 
            game={game} 
            predictions={predictions[game.id]} 
          />
        ))}
      </div>
    </div>
  );
} 