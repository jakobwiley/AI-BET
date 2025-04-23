import axios from 'axios';
import { Game, PlayerProp, Prediction, SportType, PredictionType, GameStatus, PlayerPropType } from '@/models/types';
import { handleSportsApiError } from '@/lib/errors';
import { OddsApiService } from './oddsApi';

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
  private static oddsService: OddsApiService | null = null;

  private static getOddsService(): OddsApiService {
    if (!this.oddsService) {
      const apiKey = process.env.THE_ODDS_API_KEY;
      const apiHost = process.env.ODDS_API_HOST;
      this.oddsService = new OddsApiService(apiKey, apiHost);
    }
    return this.oddsService;
  }

  /**
   * Fetch upcoming games for a specific sport
   */
  static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      // Use the real OddsApiService to fetch games
      const oddsService = this.getOddsService();
      return await oddsService.getUpcomingGames(sport);
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
      // Use the real OddsApiService to fetch game details
      const oddsService = this.getOddsService();
      const game = await oddsService.findGameByIdInUpcoming(gameId);
      
      if (!game) {
        throw new Error(`Game not found: ${gameId}`);
      }

      // Return the predictions from the game
      return game.predictions || [];
    } catch (error) {
      console.error(`Error fetching predictions for game ${gameId}:`, error);
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
          startTime: gameDate.toISOString(),
          homeTeamId: `home-team-${i}`,
          awayTeamId: `away-team-${i}`,
          homeTeamName: ['Lakers', 'Warriors', 'Celtics', 'Bucks', 'Heat'][i % 5],
          awayTeamName: ['Nets', 'Suns', 'Mavericks', 'Nuggets', '76ers'][i % 5],
          status: GameStatus.SCHEDULED,
          predictions: []
        });
      } else {
        games.push({
          id: `mlb-game-${i}`,
          sport: 'MLB',
          gameDate: gameDate.toISOString(),
          startTime: gameDate.toISOString(),
          homeTeamId: `home-team-${i}`,
          awayTeamId: `away-team-${i}`,
          homeTeamName: ['Yankees', 'Dodgers', 'Red Sox', 'Cubs', 'Astros'][i % 5],
          awayTeamName: ['Braves', 'Giants', 'Cardinals', 'Mets', 'Blue Jays'][i % 5],
          status: GameStatus.SCHEDULED,
          predictions: []
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
    
    // Use gameId to seed some variation
    const gameNumber = parseInt(gameId.split('-')[2]);
    const isHomeTeamFavored = (gameNumber % 2) === 0;
    
    for (const type of predictionTypes) {
      let value = 0;
      let confidence = Math.round(Math.random() * 15 + 75); // 75-90%
      let reasoning = '';
      
      switch (type) {
        case 'SPREAD':
          // Spreads between -12.5 and +12.5
          value = (isHomeTeamFavored ? -1 : 1) * (Math.floor(Math.random() * 25 + 1) / 2);
          reasoning = `Based on recent performance and historical matchups, we predict ${value > 0 ? 'AWAY +' + value : 'HOME ' + value} with ${confidence}% confidence. The home team has covered the spread in 7 of their last 10 games.`;
          break;
        case 'MONEYLINE':
          // Moneyline between -300 and +250
          value = isHomeTeamFavored ? 
            -(Math.floor(Math.random() * 200) + 100) : // -100 to -300
            (Math.floor(Math.random() * 150) + 100);   // +100 to +250
          reasoning = `Our models give the ${value < 0 ? 'HOME' : 'AWAY'} team a ${confidence}% chance of winning based on current form, injuries, and head-to-head statistics.`;
          break;
        case 'TOTAL':
          // Totals between 210 and 240 for NBA
          value = Math.floor(Math.random() * 30) + 210;
          const prediction = Math.random() > 0.5 ? 'OVER' : 'UNDER';
          reasoning = `For the total points, we predict ${prediction} ${value} with ${confidence}% confidence. Recent games between these teams have averaged ${value - 5} points.`;
          break;
      }
      
      predictions.push({
        id: `prediction-${gameId}-${type}`,
        gameId,
        predictionType: type,
        predictionValue: value,
        confidence: confidence / 100, // Store as decimal but display as percentage
        reasoning,
        createdAt: new Date().toISOString(),
        grade: 'PENDING'
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
      'NBA': [PlayerPropType.POINTS, PlayerPropType.REBOUNDS, PlayerPropType.ASSISTS],
      'MLB': [PlayerPropType.HITS, PlayerPropType.HOME_RUNS, PlayerPropType.STOLEN_BASES]
    };
    
    const relevantPlayers = players.slice(0, sport === 'NBA' ? 3 : 2);
    const relevantProps = propTypes[sport];
    
    for (const player of relevantPlayers) {
      for (const propType of relevantProps) {
        let line = 0;
        let prediction = 0;
        let confidence = Math.round((Math.random() * 30 + 60)); // 60-90
        let reasoning = '';
        
        switch (propType) {
          case PlayerPropType.POINTS:
            line = 24.5;
            prediction = 26.3;
            reasoning = `${player.name} has averaged ${prediction} points in the last 10 games.`;
            break;
          case PlayerPropType.REBOUNDS:
            line = 8.5;
            prediction = 9.1;
            reasoning = `${player.name} has averaged ${prediction} rebounds in the last 10 games.`;
            break;
          case PlayerPropType.ASSISTS:
            line = 6.5;
            prediction = 7.2;
            reasoning = `${player.name} has averaged ${prediction} assists in the last 10 games.`;
            break;
          case PlayerPropType.HITS:
            line = 1.5;
            prediction = 1.8;
            reasoning = `${player.name} has averaged ${prediction} hits per game.`;
            break;
          case PlayerPropType.HOME_RUNS:
            line = 0.5;
            prediction = 0.4;
            reasoning = `${player.name} has hit home runs in 4 of the last 10 games.`;
            break;
          case PlayerPropType.STOLEN_BASES:
            line = 0.5;
            prediction = 0.3;
            reasoning = `${player.name} has stolen bases in 3 of the last 10 games.`;
            break;
          default:
            line = 0;
            prediction = 0;
            reasoning = 'No specific reasoning available for this prop.';
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
          outcome: 'PENDING'
        });
      }
    }
    
    return props;
  }
} 