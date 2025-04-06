import { useState, useEffect } from 'react';
import { SportsApiService } from '@/lib/sportsApi';
import { Game, Prediction, PlayerProp } from '@/models/types';

export function useUpcomingGames(sport: string) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true);
        const data = await SportsApiService.getUpcomingGames(sport);
        setGames(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [sport]);

  return { games, loading, error };
}

export function useGamePredictions(gameId: string) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      try {
        setLoading(true);
        const data = await SportsApiService.getPredictionsForGame(gameId);
        setPredictions(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchPredictions();
  }, [gameId]);

  return { predictions, loading, error };
}

export function usePlayerProps(gameId: string, sport: string) {
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPlayerProps() {
      try {
        setLoading(true);
        const data = await SportsApiService.getPlayerPropsForGame(gameId, sport);
        setPlayerProps(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayerProps();
  }, [gameId, sport]);

  return { playerProps, loading, error };
} 