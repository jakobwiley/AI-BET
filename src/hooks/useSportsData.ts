"use client";

import { useState, useEffect } from 'react';
import { Game, SportType } from '@/models/types';
import axios from 'axios';
import { OddsApiService } from '@/lib/oddsApi';

interface UseSportsDataResult {
  games: Game[];
  loading: boolean;
  error: Error | null;
}

interface UsePredictionsResult {
  game: Game | null;
  loading: boolean;
  error: Error | null;
}

export function useUpcomingGames(sport: SportType): UseSportsDataResult {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/games?sport=${sport}`);
        if (!response.ok) {
          throw new Error('Failed to fetch games');
        }
        const data = await response.json();
        console.log(`[useSportsData] Fetched ${data.length} ${sport} games:`, data);
        setGames(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError(err instanceof Error ? err : new Error('Failed to load games'));
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [sport]);

  return { games, loading, error };
}

export function useGamePredictions(gameId: string): UsePredictionsResult {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        // For now, we'll fetch all games and find the one we want
        // Later we can add a specific endpoint for single game details
        const response = await axios.get(`/api/games?sport=NBA`);
        const foundGame = response.data.find((g: Game) => g.id === gameId);
        if (!foundGame) {
          // Try MLB if not found in NBA
          const mlbResponse = await axios.get(`/api/games?sport=MLB`);
          const mlbGame = mlbResponse.data.find((g: Game) => g.id === gameId);
          setGame(mlbGame || null);
        } else {
          setGame(foundGame);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching game:', err);
        setError(err instanceof Error ? err : new Error('Failed to load game'));
        setGame(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  return { game, loading, error };
} 