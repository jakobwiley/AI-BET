'use client';

import React, { useState } from 'react';
import { Game, SportType, Prediction, PlayerProp } from '@/models/types';
import { useGamePredictions } from '@/hooks/useSportsData';
import { SportsDataApiService } from '@/lib/sportsDataApi';
import PredictionCard from './PredictionCard';
import PlayerPropCard from './PlayerPropCard';
import { motion } from 'framer-motion';
import { FaSpinner } from 'react-icons/fa';

interface GameDetailsProps {
  game: Game;
  initialPredictions: Prediction[];
  initialPlayerProps: PlayerProp[];
  isLoading?: boolean;
}

const GameDetails: React.FC<GameDetailsProps> = ({ game, initialPredictions = [], initialPlayerProps = [], isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'predictions' | 'playerProps'>('predictions');
  const [predictions, setPredictions] = useState<Prediction[]>(initialPredictions);
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>(initialPlayerProps);
  const [loading, setLoading] = useState(false);
  
  // Get team logos
  const homeTeamLogo = SportsDataApiService.getTeamLogoUrl(game.sport, game.homeTeamId, game.homeTeamName);
  const awayTeamLogo = SportsDataApiService.getTeamLogoUrl(game.sport, game.awayTeamId, game.awayTeamName);
  
  // Format date
  const gameDate = game.startTime || game.gameDate;
  const formattedDate = gameDate 
    ? new Date(gameDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) 
    : 'TBD';
  
  // Format spread
  const spreadDisplay = game.spread 
    ? `${game.homeTeamName} ${game.spread.home >= 0 ? '+' : ''}${game.spread.home}` 
    : null;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-300">Loading predictions...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {/* Game header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{game.awayTeamName} vs {game.homeTeamName}</h1>
        <div className="text-gray-600">{formattedDate}</div>
        {game.status && (
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
              game.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
              game.status === 'In Progress' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {game.status}
            </span>
          </div>
        )}
      </div>
      
      {/* Teams section */}
      <div className="flex justify-between items-center mb-8 px-4">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 mb-3">
            <img 
              src={awayTeamLogo} 
              alt={`${game.awayTeamName} logo`} 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Team+Logo';
              }}
            />
          </div>
          <h2 className="text-xl font-bold">{game.awayTeamName}</h2>
          <div className="text-sm text-gray-600">Away</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold">VS</div>
          {spreadDisplay && (
            <div className="mt-2 p-2 bg-gray-100 rounded-lg text-sm">
              Spread: {spreadDisplay}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 mb-3">
            <img 
              src={homeTeamLogo} 
              alt={`${game.homeTeamName} logo`} 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Team+Logo';
              }}
            />
          </div>
          <h2 className="text-xl font-bold">{game.homeTeamName}</h2>
          <div className="text-sm text-gray-600">Home</div>
        </div>
      </div>
      
      {/* Predictions section */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'predictions'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('predictions')}
        >
          Predictions
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'playerProps'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('playerProps')}
        >
          Player Props
        </button>
      </div>
      
      {activeTab === 'predictions' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-bold mb-4">Game Predictions</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <FaSpinner className="animate-spin text-2xl text-blue-500" />
            </div>
          ) : predictions.length > 0 ? (
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
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <FaSpinner className="animate-spin text-2xl text-blue-500" />
            </div>
          ) : playerProps.length > 0 ? (
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
      
      {/* Sport-specific stats section */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Game Stats</h3>
        
        {game.sport === 'NBA' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">{game.awayTeamName} Key Stats</h4>
              <p className="text-sm text-gray-600">
                Stats will be available when the game starts
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">{game.homeTeamName} Key Stats</h4>
              <p className="text-sm text-gray-600">
                Stats will be available when the game starts
              </p>
            </div>
          </div>
        ) : game.sport === 'MLB' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">{game.awayTeamName} Pitching</h4>
              <p className="text-sm text-gray-600">
                Pitching stats will be available when the game starts
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">{game.homeTeamName} Batting</h4>
              <p className="text-sm text-gray-600">
                Batting stats will be available when the game starts
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GameDetails; 