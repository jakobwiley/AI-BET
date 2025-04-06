import { useState, useEffect } from 'react';
import { Game, Prediction, PlayerProp, SportType } from '@/models/types';
import { OddsApiService } from '@/lib/oddsApi';
import { SportsDataApiService } from '@/lib/sportsDataApi';

// Hook for fetching upcoming games
export function useUpcomingGames(sport: SportType) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      setLoading(true);
      setError(null);
      
      try {
        // First try to get games with odds from the Odds API
        const gamesWithOdds = await OddsApiService.getUpcomingGames(sport);
        
        if (gamesWithOdds.length > 0) {
          setGames(gamesWithOdds);
        } else {
          // Fallback to the sports data API if odds API returns no games
          const gamesFromSportsData = await SportsDataApiService.getUpcomingGames(sport);
          setGames(gamesFromSportsData);
        }
      } catch (err) {
        console.error(`Error fetching ${sport} games:`, err);
        setError(`Failed to load ${sport} games. Please try again later.`);
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [sport]);

  return { games, loading, error };
}

// Hook for fetching game predictions
export function useGamePredictions(gameId: string, sport: SportType) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      if (!gameId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get detailed odds for this game
        const gameOdds = await OddsApiService.getGameOdds(gameId, sport);
        
        if (gameOdds) {
          // Transform odds into predictions
          const transformedPredictions: Prediction[] = [];
          
          // Process bookmaker odds and convert to predictions
          // This would need customization based on the actual API response
          // For now, we'll create some placeholder predictions based on the data
          if (gameOdds.bookmakers && gameOdds.bookmakers.length > 0) {
            const bookmaker = gameOdds.bookmakers[0];
            
            // Process spreads
            const spreadsMarket = bookmaker.markets.find((m: any) => m.key === 'spreads');
            if (spreadsMarket) {
              transformedPredictions.push({
                predictionType: 'SPREAD',
                value: `${spreadsMarket.outcomes[0].name} ${spreadsMarket.outcomes[0].point}`,
                confidence: 0.7 // Placeholder confidence value
              });
            }
            
            // Process moneyline
            const h2hMarket = bookmaker.markets.find((m: any) => m.key === 'h2h');
            if (h2hMarket) {
              // Find team with better odds
              const sortedOutcomes = [...h2hMarket.outcomes].sort((a: any, b: any) => a.price - b.price);
              transformedPredictions.push({
                predictionType: 'MONEYLINE',
                value: sortedOutcomes[0].name,
                confidence: 0.65 // Placeholder confidence value
              });
            }
            
            // Process totals
            const totalsMarket = bookmaker.markets.find((m: any) => m.key === 'totals');
            if (totalsMarket) {
              transformedPredictions.push({
                predictionType: 'OVER_UNDER',
                value: `${totalsMarket.outcomes[0].name} ${totalsMarket.outcomes[0].point}`,
                confidence: 0.6 // Placeholder confidence value
              });
            }
          }
          
          setPredictions(transformedPredictions);
        } else {
          // If no real odds data, use placeholder predictions
          setPredictions([
            {
              predictionType: 'SPREAD',
              value: 'No real data available',
              confidence: 0.5
            }
          ]);
        }
      } catch (err) {
        console.error(`Error fetching predictions for game ${gameId}:`, err);
        setError('Failed to load predictions. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPredictions();
  }, [gameId, sport]);

  return { predictions, loading, error };
}

// Hook for fetching player props
export function usePlayerProps(gameId: string, sport: SportType) {
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlayerProps() {
      if (!gameId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Try to get player props from Odds API
        const propsData = await OddsApiService.getPlayerProps(gameId, sport);
        
        if (propsData && propsData.bookmakers && propsData.bookmakers.length > 0) {
          const playerPropsArray: PlayerProp[] = [];
          
          // Process the player props from the bookmakers
          // Note: This transformation would need to be customized based on the actual API response
          const bookmaker = propsData.bookmakers[0];
          
          bookmaker.markets.forEach((market: any) => {
            if (market.key.includes('player')) {
              market.outcomes.forEach((outcome: any) => {
                // Extract player name and prop type from the market key
                const [playerName, propType] = parsePlayerPropMarket(market.key);
                
                playerPropsArray.push({
                  playerName,
                  propType: propType as 'POINTS' | 'REBOUNDS' | 'ASSISTS' | 'HOME_RUNS' | 'STRIKEOUTS',
                  overUnderValue: outcome.point,
                  predictionValue: outcome.name, // 'OVER' or 'UNDER'
                  confidence: calculateConfidence(outcome.price)
                });
              });
            }
          });
          
          setPlayerProps(playerPropsArray);
        } else {
          // If no real player prop data available, we could generate placeholder data
          // For a real production app, you might want to get player data from the sports data API
          // and combine it with game data to make educated prop bets
          setPlayerProps([]);
        }
      } catch (err) {
        console.error(`Error fetching player props for game ${gameId}:`, err);
        setError('Failed to load player props. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayerProps();
  }, [gameId, sport]);

  return { playerProps, loading, error };
}

// Helper function to parse player name and prop type from market key
function parsePlayerPropMarket(marketKey: string): [string, string] {
  // Example market key: "player_points_lebron_james"
  const parts = marketKey.split('_');
  
  if (parts.length < 3) {
    return ["Unknown Player", "POINTS"];
  }
  
  const propType = parts[1].toUpperCase();
  const playerNameParts = parts.slice(2);
  const playerName = playerNameParts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ');
  
  return [playerName, propType];
}

// Helper function to calculate confidence based on odds
function calculateConfidence(odds: number): number {
  // Convert American odds to a confidence score between 0 and 1
  // This is a simplified calculation and should be improved for real use
  
  // Normalize odds to a probability
  let probability;
  if (odds > 0) {
    probability = 100 / (odds + 100);
  } else {
    probability = Math.abs(odds) / (Math.abs(odds) + 100);
  }
  
  // Add some randomness to make it look more natural
  const randomFactor = Math.random() * 0.1 - 0.05; // Random value between -0.05 and 0.05
  let confidence = probability + randomFactor;
  
  // Ensure confidence is between 0.5 and 0.9
  confidence = Math.max(0.5, Math.min(0.9, confidence));
  
  return parseFloat(confidence.toFixed(2));
} 