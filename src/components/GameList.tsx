'use client';

import React from 'react';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { SportType, Game } from '@/models/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface GameListProps {
  sport: SportType;
}

export default function GameList({ sport }: GameListProps) {
  const { games, loading, error } = useUpcomingGames(sport);

  console.log(`[GameList] Rendering ${sport} games:`, { 
    games, 
    loading, 
    error,
    gamesLength: games?.length || 0,
    hasOdds: games?.some(g => g.odds),
    firstGame: games?.[0]
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} data-testid="loading-skeleton" className="animate-pulse">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="h-6 bg-gray-800 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-800 rounded"></div>
                <div className="h-4 bg-gray-800 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500">Error loading games: {error.message}</p>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">No upcoming games found for {sport}</p>
      </div>
    );
  }

  // Group games by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const gamesByDay = games.reduce((acc, game) => {
    const gameDate = new Date(game.gameDate);
    gameDate.setHours(0, 0, 0, 0);

    if (gameDate.getTime() === today.getTime()) {
      acc.today.push(game);
    } else if (gameDate.getTime() === tomorrow.getTime()) {
      acc.tomorrow.push(game);
    }
    return acc;
  }, { today: [] as Game[], tomorrow: [] as Game[] });

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const GameCard = ({ game }: { game: Game }) => (
    <Link
      key={game.id}
      href={`/games/${game.id}`}
      className="block"
    >
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-blue-500 transition-all duration-200">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold text-white" data-testid="game-teams">
              {game.homeTeamName} vs {game.awayTeamName}
            </div>
            <div className="text-sm text-gray-400">
              {game.startTime}
            </div>
          </div>

          {game.odds && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Spread</div>
                  <div className="flex flex-col items-center">
                    <div className="text-gray-300">{game.odds.spread.home.line > 0 ? '+' : ''}{game.odds.spread.home.line}</div>
                    <div className="text-sm text-blue-400">{game.odds.spread.home.odds > 0 ? '+' : ''}{game.odds.spread.home.odds}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Total</div>
                  <div className="flex flex-col items-center">
                    <div className="text-gray-300">O/U {game.odds.total.over.line}</div>
                    <div className="text-sm text-blue-400">{game.odds.total.over.odds > 0 ? '+' : ''}{game.odds.total.over.odds}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">ML</div>
                  <div className="flex flex-col items-center">
                    <div className="text-gray-300">{game.odds.moneyline.home > 0 ? '+' : ''}{game.odds.moneyline.home}</div>
                    <div className="text-sm text-blue-400">{game.odds.moneyline.away > 0 ? '+' : ''}{game.odds.moneyline.away}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
            <span className="text-blue-500 hover:text-blue-400 text-sm">
              View All Predictions
            </span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-8">
      {gamesByDay.today.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">Today</span>
            <span className="text-lg font-normal text-gray-400">
              {formatDateHeader(today)}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gamesByDay.today.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}

      {gamesByDay.tomorrow.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">Tomorrow</span>
            <span className="text-lg font-normal text-gray-400">
              {formatDateHeader(tomorrow)}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gamesByDay.tomorrow.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}

      {gamesByDay.today.length === 0 && gamesByDay.tomorrow.length === 0 && (
        <div className="text-center text-gray-500">
          No games scheduled for today or tomorrow
        </div>
      )}
    </div>
  );
} 