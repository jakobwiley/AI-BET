'use client';

import React from 'react';
import { Game } from '@/models/types';
import { formatDate } from '@/utils/formatting';

interface GameDetailsProps {
  game: Game;
}

export default function GameDetails({ game }: GameDetailsProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">
          {game.homeTeamName} vs {game.awayTeamName}
        </h1>
        <div className="text-gray-400">{formatDate(game.gameDate)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Game Info</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-white">{game.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sport:</span>
              <span className="text-white">{game.sport}</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Odds</h2>
          {game.odds ? (
            <div className="space-y-2">
              {game.odds.spread && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Spread:</span>
                  <span className="text-white">
                    {game.odds.spread.homeSpread > 0 ? '+' : ''}{game.odds.spread.homeSpread} ({game.odds.spread.homeOdds})
                  </span>
                </div>
              )}
              {game.odds.moneyline && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Moneyline:</span>
                  <span className="text-white">
                    {game.odds.moneyline.homeOdds > 0 ? '+' : ''}{game.odds.moneyline.homeOdds}
                  </span>
                </div>
              )}
              {game.odds.total && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white">
                    O/U {game.odds.total.overUnder} ({game.odds.total.overOdds})
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Odds not available</div>
          )}
        </div>
      </div>
    </div>
  );
} 