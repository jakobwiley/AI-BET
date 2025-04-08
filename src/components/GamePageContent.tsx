'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { Game, Prediction, PlayerProp } from '@/models/types';
import GameDetails from './GameDetails';

interface GamePageContentProps {
  game: Game;
  predictions: Prediction[];
  playerProps: PlayerProp[];
}

export default function GamePageContent({ game, predictions, playerProps }: GamePageContentProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Link 
        href={`/${game.sport.toLowerCase()}`}
        className="inline-flex items-center text-blue-500 hover:text-blue-600 mb-6"
      >
        <FaArrowLeft className="mr-2" />
        Back to {game.sport} Games
      </Link>
      
      <GameDetails 
        game={game}
        initialPredictions={predictions}
        initialPlayerProps={playerProps}
      />
    </div>
  );
} 