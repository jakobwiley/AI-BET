import { Game } from '@/models/types';
import { useGamePredictions, usePlayerProps } from '@/hooks/useSportsData';
import { format } from 'date-fns';
import PredictionCard from './PredictionCard';
import PlayerProps from './PlayerProps';

interface GameDetailsProps {
  game: Game;
}

export default function GameDetails({ game }: GameDetailsProps) {
  const { predictions, loading: predictionsLoading, error: predictionsError } = useGamePredictions(game.id);
  const { playerProps, loading: propsLoading, error: propsError } = usePlayerProps(game.id, game.sport);

  return (
    <div className="p-4">
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-white text-2xl font-bold">
            {game.homeTeamName} vs {game.awayTeamName}
          </h1>
          <span className="bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full text-sm">
            {game.sport}
          </span>
        </div>
        <div className="text-gray-300 mb-2">
          {format(new Date(game.gameDate), 'EEEE, MMMM d, yyyy h:mm a')}
        </div>
        <div className="bg-gray-700/50 p-2 rounded text-gray-400 text-sm">
          Game Status: <span className="text-white">{game.status}</span>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-white text-xl font-bold mb-4">Game Predictions</h2>
        {predictionsLoading ? (
          <div className="text-white">Loading predictions...</div>
        ) : predictionsError ? (
          <div className="text-red-500">Error loading predictions</div>
        ) : predictions.length === 0 ? (
          <div className="text-gray-400">No predictions available</div>
        ) : (
          <div>
            {predictions.map(prediction => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-white text-xl font-bold mb-4">Player Props</h2>
        {propsLoading ? (
          <div className="text-white">Loading player props...</div>
        ) : propsError ? (
          <div className="text-red-500">Error loading player props</div>
        ) : (
          <PlayerProps gameId={game.id} sport={game.sport} />
        )}
      </div>
    </div>
  );
} 