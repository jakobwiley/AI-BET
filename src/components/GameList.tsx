import React from 'react';
import Link from 'next/link';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { SportType } from '@/models/types';
import { SportsDataApiService } from '@/lib/sportsDataApi';

interface GameCardProps {
  id: string;
  homeTeam: string;
  homeTeamId: string;
  awayTeam: string;
  awayTeamId: string;
  startTime: Date | undefined;
  spread: { home: number; away: number } | undefined;
  sport: SportType;
}

const GameCard: React.FC<GameCardProps> = ({ 
  id, 
  homeTeam, 
  homeTeamId,
  awayTeam, 
  awayTeamId,
  startTime, 
  spread,
  sport 
}) => {
  // Format date for display
  const formattedDate = startTime 
    ? new Date(startTime).toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) 
    : 'TBD';
  
  // Get team logos
  const homeTeamLogo = SportsDataApiService.getTeamLogoUrl(sport, homeTeamId, homeTeam);
  const awayTeamLogo = SportsDataApiService.getTeamLogoUrl(sport, awayTeamId, awayTeam);
  
  // Format spread for display
  const spreadDisplay = spread 
    ? `${homeTeam} ${spread.home >= 0 ? '+' : ''}${spread.home}` 
    : 'No spread available';
  
  return (
    <Link href={`/games/${id}`}>
      <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">{formattedDate}</span>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {sport}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 mr-2">
              <img src={awayTeamLogo} alt={`${awayTeam} logo`} className="w-full h-full object-contain" />
            </div>
            <span className="font-medium">{awayTeam}</span>
          </div>
          <span className="text-xs text-gray-600">@</span>
          <div className="flex items-center">
            <span className="font-medium">{homeTeam}</span>
            <div className="w-8 h-8 ml-2">
              <img src={homeTeamLogo} alt={`${homeTeam} logo`} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
        
        {spread && (
          <div className="text-sm text-gray-600 mt-2">
            <span>Spread: {spreadDisplay}</span>
          </div>
        )}
        
        <div className="mt-3 text-right">
          <span className="text-xs text-blue-600 font-medium">View Details →</span>
        </div>
      </div>
    </Link>
  );
};

interface GameListProps {
  sport: SportType;
}

const GameList: React.FC<GameListProps> = ({ sport }) => {
  const { games, loading, error } = useUpcomingGames(sport);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading games...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
        <strong className="font-bold">No games available. </strong>
        <span className="block sm:inline">Check back later for upcoming games.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Upcoming {sport} Games</h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameCard
            key={game.id}
            id={game.id}
            homeTeam={game.homeTeamName}
            homeTeamId={game.homeTeamId}
            awayTeam={game.awayTeamName}
            awayTeamId={game.awayTeamId}
            startTime={game.startTime || game.gameDate}
            spread={game.spread}
            sport={sport}
          />
        ))}
      </div>
    </div>
  );
};

export default GameList; 