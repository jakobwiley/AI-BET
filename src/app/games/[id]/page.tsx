'use client';

import { useState, useEffect } from 'react';
import { SportsApiService } from '@/lib/sportsApi';
import { Game, Prediction, PlayerProp } from '@/models/types';
import PredictionCard from '@/components/PredictionCard';
import PlayerPropCard from '@/components/PlayerPropCard';
import { FaSpinner, FaBasketballBall, FaBaseballBall, FaArrowLeft } from 'react-icons/fa';
import { format } from 'date-fns';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function GamePage({ params }: { params: { id: string } }) {
  const [game, setGame] = useState<Game | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<'predictions' | 'playerProps'>('predictions');

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        setLoading(true);
        
        // In a real app, you would have an API endpoint to get a specific game
        // For this example, we'll get all games and find the one with the matching ID
        const sport = params.id.startsWith('nba') ? 'NBA' : 'MLB';
        const games = await SportsApiService.getUpcomingGames(sport);
        const foundGame = games.find(g => g.id === params.id);
        
        if (!foundGame) {
          throw new Error('Game not found');
        }
        
        setGame(foundGame);
        
        // Fetch predictions and player props
        const gamePredictions = await SportsApiService.getPredictionsForGame(params.id);
        const gamePlayerProps = await SportsApiService.getPlayerPropsForGame(params.id, sport);
        
        setPredictions(gamePredictions);
        setPlayerProps(gamePlayerProps);
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch game details'));
      } finally {
        setLoading(false);
      }
    };

    fetchGameDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
        <p className="text-gray-300">Loading game details...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Game</h1>
        <p className="text-gray-300 mb-4">{error?.message || 'Game not found'}</p>
        <Link 
          href={`/${game?.sport.toLowerCase() || ''}`}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
        >
          <FaArrowLeft className="mr-2" />
          Back to Games
        </Link>
      </div>
    );
  }

  // Get the appropriate sport icon
  const SportIcon = game.sport === 'NBA' ? FaBasketballBall : FaBaseballBall;

  return (
    <div className="py-8">
      <Link 
        href={`/${game.sport.toLowerCase()}`}
        className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6"
      >
        <FaArrowLeft className="mr-2" />
        Back to {game.sport} Games
      </Link>
      
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl mb-8">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <SportIcon className="text-blue-500 mr-2 text-xl" />
            <span className="text-gray-400">
              {format(new Date(game.gameDate), 'EEEE, MMMM d, yyyy • h:mm a')}
            </span>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{game.homeTeamName}</h2>
              <p className="text-gray-400 text-sm">Home</p>
            </div>
            
            <div className="flex flex-col items-center px-6">
              <p className="text-gray-500 font-bold text-lg md:text-xl">vs</p>
              <p className="text-sm text-gray-500 rounded-full px-2 py-1 bg-gray-700 mt-1">
                {game.status}
              </p>
            </div>
            
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{game.awayTeamName}</h2>
              <p className="text-gray-400 text-sm">Away</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b border-gray-700">
          <button
            className={`py-3 px-6 text-sm font-medium ${
              activeTab === 'predictions' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('predictions')}
          >
            Game Predictions
          </button>
          <button
            className={`py-3 px-6 text-sm font-medium ${
              activeTab === 'playerProps' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('playerProps')}
          >
            Player Props
          </button>
        </div>
      </div>
      
      {activeTab === 'predictions' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-bold mb-4">Game Predictions</h2>
          
          {predictions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {predictions.map((prediction) => (
                <PredictionCard key={prediction.id} prediction={prediction} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-800 rounded-xl">
              <p className="text-gray-300">No predictions available for this game yet.</p>
            </div>
          )}
        </motion.div>
      )}
      
      {activeTab === 'playerProps' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-bold mb-4">Player Props</h2>
          
          {playerProps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {playerProps.map((prop) => (
                <PlayerPropCard key={prop.id} playerProp={prop} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-800 rounded-xl">
              <p className="text-gray-300">No player props available for this game yet.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
} 