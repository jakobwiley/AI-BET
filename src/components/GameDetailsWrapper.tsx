'use client';

import React from 'react';
import { Game, Prediction, PlayerProp } from '@/models/types';
import GameDetails from './GameDetails';

interface GameDetailsWrapperProps {
  game: Game;
  initialPredictions: Prediction[];
  initialPlayerProps: PlayerProp[];
}

export default function GameDetailsWrapper(props: GameDetailsWrapperProps) {
  return <GameDetails {...props} />;
} 