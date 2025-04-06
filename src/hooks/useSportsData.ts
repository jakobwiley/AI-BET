import { useState, useEffect } from 'react';
import { Game, Prediction, PlayerProp, SportType } from '@/models/types';
import { OddsApiService } from '@/lib/oddsApi';
import { SportsDataApiService } from '@/lib/sportsDataApi';

// Hook for getting upcoming games
export function useUpcomingGames(sport: SportType) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to fetch games
  const fetchGames = async (forceFresh: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to get from Odds API (with potential caching)
      const oddsGames = await OddsApiService.getUpcomingGames(sport, forceFresh);
      
      if (oddsGames && oddsGames.length > 0) {
        setGames(oddsGames);
        setLastUpdated(new Date());
      } else {
        // Fallback to SportsDataApi if OddsApi returns nothing
        const sportsDataGames = await SportsDataApiService.getUpcomingGames(sport);
        setGames(sportsDataGames);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error(`Error fetching ${sport} games:`, err);
      setError(`Failed to load games: ${err.message}`);
      
      // Try to get from SportsDataApi as a fallback
      try {
        const fallbackGames = await SportsDataApiService.getUpcomingGames(sport);
        if (fallbackGames && fallbackGames.length > 0) {
          setGames(fallbackGames);
          setLastUpdated(new Date());
          setError(null); // Clear error if fallback succeeds
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch games on initial load
  useEffect(() => {
    fetchGames();
  }, [sport]);

  return { 
    games, 
    loading, 
    error, 
    lastUpdated,
    refresh: (forceFresh: boolean = true) => fetchGames(forceFresh),
    apiUsage: OddsApiService.getApiUsageStats(),
    remainingCalls: OddsApiService.getRemainingApiCalls()
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
      const gameOdds = await OddsApiService.getGameOdds(gameId, sport, forceFresh);
      setPredictions(gameOdds);
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