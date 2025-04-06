'use client';

import { useState, useEffect } from 'react';
import { Game, Prediction, PlayerProp, SportType } from '@/models/types';
import { OddsApiService } from '@/lib/oddsApi';
import { SportsDataApiService } from '@/lib/sportsDataApi';
import { ESPNApiService } from '@/lib/espnApi';

// Hook for getting upcoming games
export function useUpcomingGames(sport: SportType) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [usingOddsApi, setUsingOddsApi] = useState<boolean>(false);

  useEffect(() => {
    async function testApiKey() {
      const isValid = await OddsApiService.testApiKey();
      setApiKeyValid(isValid);
      if (!isValid) {
        console.warn('[useSportsData] API key is invalid or not working. Using mock data.');
      }
    }

    testApiKey();
  }, []);

  // Function to fetch games
  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch games from ESPN API
      const espnGames = await ESPNApiService.getUpcomingGames(sport);
      console.log(`[useSportsData] Received ${espnGames.length} games from ESPN for ${sport}`);

      // Fetch odds data if API key is valid
      let oddsGames: Game[] = [];
      if (apiKeyValid) {
        try {
          oddsGames = await OddsApiService.getGameOdds(sport);
          console.log(`[useSportsData] Received ${oddsGames.length} games with odds for ${sport}`);
          setUsingOddsApi(true);
        } catch (oddsError) {
          console.warn(`[useSportsData] Failed to fetch odds data: ${oddsError}`);
          setUsingOddsApi(false);
        }
      }

      // Merge ESPN games with odds data and fetch predictions
      const mergedGames = await Promise.all(espnGames.map(async espnGame => {
        const oddsGame = oddsGames.find(og => 
          og.homeTeamName === espnGame.homeTeamName && 
          og.awayTeamName === espnGame.awayTeamName
        );

        // Fetch predictions for this game
        let predictions: Prediction[] = [];
        try {
          predictions = await OddsApiService.getGamePredictions(espnGame.id, sport);
        } catch (predError) {
          console.warn(`[useSportsData] Failed to fetch predictions for game ${espnGame.id}: ${predError}`);
        }

        return {
          ...espnGame,
          spread: oddsGame?.spread || espnGame.spread,
          moneyline: oddsGame?.moneyline,
          total: oddsGame?.total,
          predictions
        };
      }));

      setGames(mergedGames);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(`Error fetching ${sport} games:`, err);
      setError(`Failed to load games: ${err.message}`);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch games on initial load and every 30 seconds
  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [sport]);

  return { 
    games, 
    loading, 
    error, 
    lastUpdated,
    refresh: () => fetchGames(),
    apiUsage: OddsApiService.getApiUsageStats(),
    remainingCalls: OddsApiService.getRemainingApiCalls(),
    apiKeyValid,
    usingOddsApi
  };
}

// Hook for getting game predictions
export function useGamePredictions(gameId: string, sport: SportType) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to fetch predictions
  const fetchPredictions = async (forceFresh: boolean = false) => {
    if (!gameId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const predictions = await OddsApiService.getGamePredictions(gameId, sport, forceFresh);
      setPredictions(predictions);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(`Error fetching predictions for game ${gameId}:`, err);
      setError(`Failed to load predictions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch predictions on initial load or when gameId changes
  useEffect(() => {
    if (gameId) {
      fetchPredictions();
    }
  }, [gameId, sport]);

  return { 
    predictions, 
    loading, 
    error, 
    lastUpdated,
    refresh: (forceFresh: boolean = true) => fetchPredictions(forceFresh)
  };
}

// Hook for getting player props
export function usePlayerProps(gameId: string, sport: SportType) {
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to fetch player props
  const fetchPlayerProps = async (forceFresh: boolean = false) => {
    if (!gameId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const props = await OddsApiService.getPlayerProps(gameId, sport, forceFresh);
      setPlayerProps(props);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(`Error fetching player props for game ${gameId}:`, err);
      setError(`Failed to load player props: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch player props on initial load or when gameId changes
  useEffect(() => {
    if (gameId) {
      fetchPlayerProps();
    }
  }, [gameId, sport]);

  return { 
    playerProps, 
    loading, 
    error, 
    lastUpdated,
    refresh: (forceFresh: boolean = true) => fetchPlayerProps(forceFresh)
  };
}

// Hook for API usage statistics
export function useApiUsage() {
  const [usageStats, setUsageStats] = useState(OddsApiService.getApiUsageStats());
  const [remainingCalls, setRemainingCalls] = useState(OddsApiService.getRemainingApiCalls());
  
  // Update stats every minute
  useEffect(() => {
    const updateStats = () => {
      setUsageStats(OddsApiService.getApiUsageStats());
      setRemainingCalls(OddsApiService.getRemainingApiCalls());
    };
    
    const interval = setInterval(updateStats, 60000); // Update every minute
    
    // Initial update
    updateStats();
    
    return () => clearInterval(interval);
  }, []);
  
  // Function to refresh all data
  const refreshAllData = async () => {
    try {
      await OddsApiService.refreshAllData();
      // Update stats after refresh
      setUsageStats(OddsApiService.getApiUsageStats());
      setRemainingCalls(OddsApiService.getRemainingApiCalls());
      return true;
    } catch (error) {
      console.error("Error refreshing all data:", error);
      return false;
    }
  };
  
  return {
    usageStats,
    remainingCalls,
    refreshAllData
  };
} 