'use client';

import { useState, useEffect } from 'react';
import { FaSpinner, FaFilter, FaSortAmountDown } from "react-icons/fa";
import GameCard from '@/components/GameCard';

// Mock data for NBA games
const mockGames = [
  {
    id: 'nba-game-1',
    sport: 'NBA' as const,
    gameDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Tomorrow
    homeTeamId: 'lakers',
    awayTeamId: 'warriors',
    homeTeamName: 'Lakers',
    awayTeamName: 'Warriors',
    status: 'SCHEDULED',
  },
  {
    id: 'nba-game-2',
    sport: 'NBA' as const,
    gameDate: new Date(new Date().getTime() + 48 * 60 * 60 * 1000), // Day after tomorrow
    homeTeamId: 'celtics',
    awayTeamId: 'bucks',
    homeTeamName: 'Celtics',
    awayTeamName: 'Bucks',
    status: 'SCHEDULED',
  },
  {
    id: 'nba-game-3',
    sport: 'NBA' as const,
    gameDate: new Date(new Date().getTime() + 72 * 60 * 60 * 1000), // 3 days from now
    homeTeamId: 'heat',
    awayTeamId: 'nets',
    homeTeamName: 'Heat',
    awayTeamName: 'Nets',
    status: 'SCHEDULED',
  }
];

// Mock predictions for each game
const mockPredictions = {
  'nba-game-1': [
    {
      id: 'pred-1',
      gameId: 'nba-game-1',
      predictionType: 'SPREAD',
      predictionValue: 'Warriors -5.5',
      confidence: 0.85,
      reasoning: 'The Warriors have covered the spread in 7 of their last 10 away games.',
      createdAt: new Date()
    },
    {
      id: 'pred-2',
      gameId: 'nba-game-1',
      predictionType: 'MONEYLINE',
      predictionValue: 'Warriors Win',
      confidence: 0.75,
      reasoning: 'The Warriors have a strong historical advantage over the Lakers this season.',
      createdAt: new Date()
    }
  ],
  'nba-game-2': [
    {
      id: 'pred-3',
      gameId: 'nba-game-2',
      predictionType: 'SPREAD',
      predictionValue: 'Celtics -3.5',
      confidence: 0.65,
      reasoning: 'The Celtics have a strong home court advantage.',
      createdAt: new Date()
    }
  ],
  'nba-game-3': [
    {
      id: 'pred-4',
      gameId: 'nba-game-3',
      predictionType: 'OVER_UNDER',
      predictionValue: 'OVER 220.5',
      confidence: 0.72,
      reasoning: 'Both teams have been scoring above their season average in recent games.',
      createdAt: new Date()
    }
  ]
};

export default function NBAPage() {
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
        <p className="text-gray-300">Loading NBA predictions...</p>
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