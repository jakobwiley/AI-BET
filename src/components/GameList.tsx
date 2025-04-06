import { useUpcomingGames } from '@/hooks/useSportsData';
import Link from 'next/link';
import { format } from 'date-fns';

interface GameListProps {
  sport: string;
}

export default function GameList({ sport }: GameListProps) {
  const { games, loading, error } = useUpcomingGames(sport);

  if (loading) {
    return <div className="text-white p-4">Loading games...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading games</div>;
  }

  if (games.length === 0) {
    return <div className="text-gray-400 p-4">No upcoming games found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {games.map((game) => (
        <Link 
          href={`/${sport.toLowerCase()}/games/${game.id}`} 
          key={game.id}
          className="bg-gray-800 hover:bg-gray-700 transition-colors duration-200 rounded-lg p-4 cursor-pointer"
        >
          <div className="flex justify-between mb-2">
            <div className="flex items-center">
              <span className="text-white font-bold mr-2">{game.homeTeamName} vs {game.awayTeamName}</span>
              <span className="text-blue-400 text-xs px-2 py-0.5 rounded bg-blue-900/40">
                {game.sport}
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              {format(new Date(game.gameDate), 'MMM d, h:mm a')}
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <div className="text-gray-300">
              {game.predictions.length > 0 ? 
                `${game.predictions.length} predictions available` : 
                'No predictions yet'}
            </div>
            <div className="text-gray-300">
              {game.playerProps.length > 0 ? 
                `${game.playerProps.length} player props` : 
                'No player props'}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 