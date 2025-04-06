import React from 'react';
import { Game, SportType } from '@/models/types';
import { useGamePredictions } from '@/hooks/useSportsData';
import { SportsDataApiService } from '@/lib/sportsDataApi';
import PredictionCard from './PredictionCard';

interface GameDetailsProps {
  game: Game;
}

const GameDetails: React.FC<GameDetailsProps> = ({ game }) => {
  const { predictions, loading: predictionsLoading, error: predictionsError } = useGamePredictions(game.id, game.sport);
  
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
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Game Predictions</h3>
        
        {predictionsLoading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading predictions...</span>
          </div>
        ) : predictionsError ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{predictionsError}</span>
          </div>
        ) : predictions.length === 0 ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">No predictions available for this game yet.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictions.map((prediction, index) => (
              <PredictionCard key={index} prediction={prediction} />
            ))}
          </div>
        )}
      </div>
      
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