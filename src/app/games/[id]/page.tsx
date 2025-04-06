import React from 'react';
import { FaSpinner, FaBasketballBall, FaBaseballBall, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PredictionCard from '@/components/PredictionCard';
import PlayerPropCard from '@/components/PlayerPropCard';
import { ESPNApiService } from '@/lib/espnApi';
import { LogoApiService } from '@/lib/logoApi';
import { OddsApiService } from '@/lib/oddsApi';
import { Game, Prediction, PlayerProp, SportType } from '@/models/types';
import GameDetails from '@/components/GameDetails';

async function getGameData(id: string) {
  // Fetch game details from ESPN API
  const games = await ESPNApiService.getUpcomingGames('NBA');
  const game = games.find((g: Game) => g.id === id);
  
  if (!game) {
    return null;
  }

  // Fetch predictions and props
  const predictions = await OddsApiService.getGamePredictions(id, game.sport);
  const playerProps = await OddsApiService.getPlayerProps(id, game.sport);

  return {
    game,
    predictions,
    playerProps
  };
}

export default async function GamePage({ params }: { params: { id: string } }) {
  const data = await getGameData(params.id);

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">Game not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="flex items-center text-blue-500 hover:text-blue-600 mb-6">
        <FaArrowLeft className="mr-2" />
        Back to Games
      </Link>
      
      <GameDetails 
        game={data.game} 
        initialPredictions={data.predictions}
        initialPlayerProps={data.playerProps}
      />
    </div>
  );
} 