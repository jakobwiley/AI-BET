import { useState, useEffect } from 'react';
import { Game, PlayerProp, Prediction, SportType } from '@/models/types';
import { SportsApiService } from '@/lib/sportsApi';

export function useUpcomingGames(sport: SportType) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const gamesData = await SportsApiService.getUpcomingGames(sport);
        setGames(gamesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch games'));
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [sport]);

  return { games, loading, error };
}

export function useGamePredictions(gameId: string) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        const predictionsData = await SportsApiService.getPredictionsForGame(gameId);
        setPredictions(predictionsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch predictions'));
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchPredictions();
    }
  }, [gameId]);

  return { predictions, loading, error };
}

export function usePlayerProps(gameId: string, sport: SportType) {
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlayerProps = async () => {
      try {
        setLoading(true);
        const propsData = await SportsApiService.getPlayerPropsForGame(gameId, sport);
        setPlayerProps(propsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch player props'));
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchPlayerProps();
    }
  }, [gameId, sport]);

  return { playerProps, loading, error };
} 