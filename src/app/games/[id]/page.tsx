'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import GameDetails from '@/components/GameDetails';
import { Game } from '@/models/types';
import { OddsApiService } from '@/lib/oddsApi';

interface GamePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GamePage({ params }: GamePageProps) {
  const resolvedParams = use(params);
  const [game, setGame] = useState<Game | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGame() {
      try {
        setIsLoading(true);
        // TODO: Implement game fetching by ID
        // const game = await OddsApiService.getGameById(resolvedParams.id);
        // setGame(game);
      } catch (error) {
        console.error('Error loading game:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadGame();
  }, [resolvedParams.id]);
  
  return (
    <div className="container mx-auto py-8">
      <GameDetails 
        game={game}
        isLoading={isLoading}
        initialPredictions={[]}
      />
    </div>
  );
} 