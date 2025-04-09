import axios from 'axios';
import { Game, PlayerProp, Prediction, SportType, PredictionType, PlayerPropType, GameStatus } from '@/models/types';

// API keys from environment variables
const SPORTS_DATA_API_KEY = process.env.SPORTS_DATA_API_KEY;
const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

// Base URLs for the APIs
const NBA_API_BASE_URL = 'https://api.sportsdata.io/v3/nba';
const MLB_API_BASE_URL = 'https://api.sportsdata.io/v3/mlb';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

/**
 * Service for fetching sports data from external APIs
 */
export class SportsApiService {
  /**
   * Fetch upcoming games for a specific sport
   */
  static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      // This is a simplified example. In a real app, you would use actual API endpoints
      // and transform the data into your Game model format
      const baseUrl = sport === 'NBA' ? NBA_API_BASE_URL : MLB_API_BASE_URL;
      
      // Mock implementation - replace with actual API call
      return this.getMockGames(sport, 5);
    } catch (error) {
      console.error(`Error fetching ${sport} games:`, error);
      throw error;
    }
  }

  /**
   * Get predictions for a specific game
   */
  static async getPredictionsForGame(gameId: string): Promise<Prediction[]> {
    try {
      // This would be where you call your prediction algorithm or ML model
      // For now, we'll return mock data
      return this.getMockPredictions(gameId);
    } catch (error) {
      console.error(`Error generating predictions for game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Get player props for a specific game
   */
  static async getPlayerPropsForGame(gameId: string, sport: SportType): Promise<PlayerProp[]> {
    try {
      // This would be where you call your player props prediction algorithm
      // For now, we'll return mock data
      return this.getMockPlayerProps(gameId, sport);
    } catch (error) {
      console.error(`Error generating player props for game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Generate mock games for development
   */
  private static getMockGames(sport: SportType, count: number): Game[] {
    const games: Game[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const gameDate = new Date(now);
      gameDate.setDate(now.getDate() + i);
      
      if (sport === 'NBA') {
        games.push({
          id: `nba-game-${i}`,
          sport: 'NBA',
          gameDate: gameDate.toISOString(),
          homeTeamId: `home-team-${i}`,
          awayTeamId: `away-team-${i}`,
          homeTeamName: ['Lakers', 'Warriors', 'Celtics', 'Bucks', 'Heat'][i % 5],
          awayTeamName: ['Nets', 'Suns', 'Mavericks', 'Nuggets', '76ers'][i % 5],
          status: GameStatus.SCHEDULED,
          startTime: gameDate.toLocaleTimeString(),
          predictions: [],
        });
      } else {
        games.push({
          id: `mlb-game-${i}`,
          sport: 'MLB',
          gameDate: gameDate.toISOString(),
          homeTeamId: `home-team-${i}`,
          awayTeamId: `away-team-${i}`,
          homeTeamName: ['Yankees', 'Dodgers', 'Red Sox', 'Cubs', 'Astros'][i % 5],
          awayTeamName: ['Braves', 'Giants', 'Cardinals', 'Mets', 'Blue Jays'][i % 5],
          status: GameStatus.SCHEDULED,
          startTime: gameDate.toLocaleTimeString(),
          predictions: [],
        });
      }
    }
    
    return games;
  }

  /**
   * Generate mock predictions for development
   */
  private static getMockPredictions(gameId: string): Prediction[] {
    const predictionTypes: PredictionType[] = ['SPREAD', 'MONEYLINE', 'TOTAL'];
    const predictions: Prediction[] = [];
    
    for (const type of predictionTypes) {
      let predictionValue = 0;
      let confidence = Math.round((Math.random() * 0.5 + 0.5) * 100); // 50 to 100
      let reasoning = '';
      let grade = 'B';
      
      switch (type) {
        case 'SPREAD':
          predictionValue = Math.random() > 0.5 ? -5.5 : 5.5;
          reasoning = `Based on recent performance and historical matchups, we predict ${predictionValue > 0 ? '+' : ''}${predictionValue} with ${confidence}% confidence. The home team has covered the spread in 7 of their last 10 games.`;
          break;
        case 'MONEYLINE':
          predictionValue = Math.random() > 0.5 ? -150 : 150;
          reasoning = `Our models favor the ${predictionValue > 0 ? 'underdog' : 'favorite'} with ${confidence}% confidence based on current form, injuries, and head-to-head statistics.`;
          break;
        case 'TOTAL':
          predictionValue = Math.floor(Math.random() * 30) + 200; // 200-230 for NBA
          reasoning = `For the total points, we predict ${predictionValue} with ${confidence}% confidence. Recent games between these teams have averaged ${predictionValue - 10} points.`;
          break;
      }
      
      predictions.push({
        id: `prediction-${gameId}-${type}`,
        gameId,
        predictionType: type,
        predictionValue,
        confidence,
        grade,
        reasoning,
        createdAt: new Date().toISOString(),
      });
    }
    
    return predictions;
  }

  /**
   * Generate mock player props for development
   */
  private static getMockPlayerProps(gameId: string, sport: SportType): PlayerProp[] {
    const props: PlayerProp[] = [];
    const players = [
      { id: 'player1', name: 'LeBron James', teamId: 'home-team-0' },
      { id: 'player2', name: 'Stephen Curry', teamId: 'away-team-0' },
      { id: 'player3', name: 'Giannis Antetokounmpo', teamId: 'home-team-1' },
      { id: 'player4', name: 'Aaron Judge', teamId: 'home-team-0' },
      { id: 'player5', name: 'Shohei Ohtani', teamId: 'away-team-0' },
    ];
    
    const propTypes: Record<SportType, PlayerPropType[]> = {
      'NBA': ['POINTS', 'REBOUNDS', 'ASSISTS'],
      'MLB': ['HITS', 'HOME_RUNS', 'STOLEN_BASES']
    };
    
    const relevantPlayers = players.slice(0, sport === 'NBA' ? 3 : 2);
    const relevantProps = propTypes[sport];
    
    for (const player of relevantPlayers) {
      for (const propType of relevantProps) {
        let line = 0;
        let prediction = 0;
        let confidence = Math.round((Math.random() * 0.3 + 0.6) * 100); // 60 to 90
        let reasoning = '';
        
        switch (propType) {
          case 'POINTS':
            line = 24.5;
            prediction = Math.random() > 0.5 ? 26 : 22;
            reasoning = `${player.name} has averaged 26.3 points in the last 10 games. We predict ${prediction} points with ${confidence}% confidence.`;
            break;
          case 'REBOUNDS':
            line = 8.5;
            prediction = Math.random() > 0.5 ? 10 : 7;
            reasoning = `${player.name} has averaged 9.1 rebounds in the last 10 games. We predict ${prediction} rebounds with ${confidence}% confidence.`;
            break;
          case 'ASSISTS':
            line = 6.5;
            prediction = Math.random() > 0.5 ? 8 : 5;
            reasoning = `${player.name} has averaged 7.2 assists in the last 10 games. We predict ${prediction} assists with ${confidence}% confidence.`;
            break;
          case 'HITS':
            line = 1.5;
            prediction = Math.random() > 0.5 ? 2 : 1;
            reasoning = `${player.name} has averaged 1.8 hits per game. We predict ${prediction} hits with ${confidence}% confidence.`;
            break;
          case 'HOME_RUNS':
            line = 0.5;
            prediction = Math.random() > 0.5 ? 1 : 0;
            reasoning = `${player.name} has hit home runs in 4 of the last 10 games. We predict ${prediction} home runs with ${confidence}% confidence.`;
            break;
          case 'STOLEN_BASES':
            line = 0.5;
            prediction = Math.random() > 0.5 ? 1 : 0;
            reasoning = `${player.name} has stolen bases in 3 of the last 10 games. We predict ${prediction} stolen bases with ${confidence}% confidence.`;
            break;
        }
        
        props.push({
          id: `prop-${gameId}-${player.id}-${propType}`,
          gameId,
          playerId: player.id,
          playerName: player.name,
          teamId: player.teamId,
          propType,
          line,
          prediction,
          confidence,
          reasoning,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    return props;
  }
} 