"use client";

import { useState, useEffect } from 'react';
import { Game, SportType, Prediction } from '@/models/types';
// Removed direct import of OddsApiService as it's not used directly here anymore
// import { OddsApiService } from '@/lib/oddsApi'; 

// Get the API base URL from environment variable or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface UseSportsDataResult {
  games: Game[];
  loading: boolean;
  error: Error | null;
}

interface UsePredictionsResult {
  game: Game | null;
  predictions: Prediction[];
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
        // Use the consistent API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/games?sport=${sport}`);
        if (!response.ok) {
          // Try to get a more specific error message
          let errorMsg = `Failed to fetch games: ${response.statusText}`;
          try {
            const errorBody = await response.json();
            errorMsg = errorBody.error || errorMsg;
          } catch (e) { /* Ignore if response body isn't JSON */ }
          throw new Error(errorMsg);
        }
        const data = await response.json();
        console.log(`[useSportsData] Fetched ${data.length} ${sport} games from /api/games:`, data);
        setGames(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching games via /api/games:', err);
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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchGameWithPredictions = async () => {
      if (!gameId) {
        setError(new Error('Game ID is required'));
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        setGame(null);
        setPredictions([]);

        console.log(`[useSportsData] Fetching game ${gameId} with predictions...`);
        
        // Use the consistent API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
        
        if (!response.ok) {
          let errorMsg = `Failed to fetch game ${gameId}: ${response.statusText}`;
          try {
            const errorBody = await response.json();
            errorMsg = errorBody.error || errorMsg;
            console.error(`[useSportsData] API Error:`, errorBody);
          } catch (e) {
            console.error(`[useSportsData] Failed to parse error response:`, e);
          }
          throw new Error(errorMsg);
        }

        const gameData: Game = await response.json();
        console.log(`[useSportsData] Received game data:`, {
          id: gameData.id,
          sport: gameData.sport,
          homeTeam: gameData.homeTeamName,
          awayTeam: gameData.awayTeamName,
          predictionsCount: gameData.predictions?.length || 0
        });

        setGame(gameData);
        setPredictions(gameData.predictions || []);
      } catch (error) {
        console.error(`[useSportsData] Error fetching game:`, error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setLoading(false);
      }
    };

    fetchGameWithPredictions();
  }, [gameId]);

  return { game, predictions, loading, error };
} 