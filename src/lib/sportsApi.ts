import axios from 'axios';
import { Game, PlayerProp, Prediction, SportType, PredictionType, PropType } from '@/models/types';

// API keys from environment variables
const SPORTS_DATA_API_KEY = process.env.NEXT_PUBLIC_SPORTS_DATA_API_KEY;
const THE_ODDS_API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Base URLs for the APIs
const NBA_API_BASE_URL = 'https://api.sportsdata.io/v3/nba';
const MLB_API_BASE_URL = 'https://api.sportsdata.io/v3/mlb';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Service for fetching sports data from external APIs
 */
export class SportsApiService {
  /**
   * Fetch upcoming games for a specific sport
   */
  static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      if (!SPORTS_DATA_API_KEY) {
        console.warn('Sports Data API key not found, using mock data');
        return this.getMockGames(sport, 5);
      }

      const baseUrl = sport === 'NBA' ? NBA_API_BASE_URL : MLB_API_BASE_URL;
      let endpoint = '';
      
      if (sport === 'NBA') {
        // Upcoming NBA games endpoint
        endpoint = `${baseUrl}/scores/json/GamesByDate/2023-04-01?key=${SPORTS_DATA_API_KEY}`;
      } else {
        // Upcoming MLB games endpoint
        endpoint = `${baseUrl}/scores/json/GamesByDate/2023-04-01?key=${SPORTS_DATA_API_KEY}`;
      }
      
      try {
        const response = await axios.get(endpoint);
        if (response.status === 200 && response.data) {
          return this.transformGamesData(response.data, sport);
        } else {
          console.warn(`No data returned from ${sport} API, using mock data`);
          return this.getMockGames(sport, 5);
        }
      } catch (apiError) {
        console.error(`API error fetching ${sport} games:`, apiError);
        return this.getMockGames(sport, 5);
      }
    } catch (error) {
      console.error(`Error fetching ${sport} games:`, error);
      return this.getMockGames(sport, 5);
    }
  }

  /**
   * Transform raw API data into our Game model format
   */
  private static transformGamesData(data: any[], sport: SportType): Game[] {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map(game => {
      if (sport === 'NBA') {
        return {
          id: game.GameID?.toString() || `nba-game-${Math.random().toString(36).substring(2, 9)}`,
          sport: 'NBA',
          gameDate: new Date(game.DateTime || new Date()),
          homeTeamId: game.HomeTeamID?.toString() || '',
          awayTeamId: game.AwayTeamID?.toString() || '',
          homeTeamName: game.HomeTeam || 'Home Team',
          awayTeamName: game.AwayTeam || 'Away Team',
          homeTeamScore: game.HomeTeamScore,
          awayTeamScore: game.AwayTeamScore,
          status: this.mapGameStatus(game.Status),
          predictions: [],
          playerProps: [],
        };
      } else {
        return {
          id: game.GameID?.toString() || `mlb-game-${Math.random().toString(36).substring(2, 9)}`,
          sport: 'MLB',
          gameDate: new Date(game.DateTime || new Date()),
          homeTeamId: game.HomeTeamID?.toString() || '',
          awayTeamId: game.AwayTeamID?.toString() || '',
          homeTeamName: game.HomeTeam || 'Home Team',
          awayTeamName: game.AwayTeam || 'Away Team',
          homeTeamScore: game.HomeTeamRuns,
          awayTeamScore: game.AwayTeamRuns,
          status: this.mapGameStatus(game.Status),
          predictions: [],
          playerProps: [],
        };
      }
    });
  }

  /**
   * Map API game status to our GameStatus type
   */
  private static mapGameStatus(status: string): 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED' {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('scheduled') || statusLower.includes('upcoming')) {
      return 'SCHEDULED';
    } else if (statusLower.includes('in progress') || statusLower.includes('live')) {
      return 'LIVE';
    } else if (statusLower.includes('final') || statusLower.includes('completed')) {
      return 'FINISHED';
    } else if (statusLower.includes('cancelled') || statusLower.includes('postponed')) {
      return 'CANCELLED';
    }
    
    return 'SCHEDULED'; // Default status
  }

  /**
   * Get predictions for a specific game using AI
   */
  static async getPredictionsForGame(gameId: string): Promise<Prediction[]> {
    try {
      if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not found, using mock data');
        return this.getMockPredictions(gameId);
      }

      // In a real app, you would fetch game data and team stats here
      // Then pass that data to OpenAI to generate predictions
      
      try {
        // Make OpenAI API call to generate predictions
        const response = await axios.post(
          OPENAI_API_URL,
          {
            model: "gpt-4-turbo",
            messages: [
              {
                role: "system",
                content: "You are a sports analytics expert. Generate prediction data for a sports game including spread, moneyline, and over/under predictions with confidence levels and reasoning."
              },
              {
                role: "user",
                content: `Generate prediction data for game ID: ${gameId}. Include spread, moneyline, and over/under predictions with confidence levels (0-1) and detailed reasoning.`
              }
            ],
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
          }
        );

        if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
          // Parse the AI-generated content and transform it into predictions
          const predictions = this.parseAIPredictions(response.data.choices[0].message.content, gameId);
          return predictions;
        } else {
          console.warn(`No data returned from OpenAI API, using mock data for game ${gameId}`);
          return this.getMockPredictions(gameId);
        }
      } catch (apiError) {
        console.error(`API error generating predictions for game ${gameId}:`, apiError);
        return this.getMockPredictions(gameId);
      }
    } catch (error) {
      console.error(`Error generating predictions for game ${gameId}:`, error);
      return this.getMockPredictions(gameId);
    }
  }

  /**
   * Parse AI-generated content into structured Prediction objects
   */
  private static parseAIPredictions(content: string, gameId: string): Prediction[] {
    try {
      // For now, returning mock data since parsing the AI response would require
      // a more complex implementation
      return this.getMockPredictions(gameId);
    } catch (error) {
      console.error('Error parsing AI predictions:', error);
      return this.getMockPredictions(gameId);
    }
  }

  /**
   * Get player props for a specific game
   */
  static async getPlayerPropsForGame(gameId: string, sport: SportType): Promise<PlayerProp[]> {
    try {
      if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not found, using mock data');
        return this.getMockPlayerProps(gameId, sport);
      }

      try {
        // Make OpenAI API call to generate player props
        const response = await axios.post(
          OPENAI_API_URL,
          {
            model: "gpt-4-turbo",
            messages: [
              {
                role: "system",
                content: `You are a sports analytics expert. Generate player prop predictions for a ${sport} game with confidence levels and reasoning.`
              },
              {
                role: "user",
                content: `Generate player prop predictions for ${sport} game ID: ${gameId}. For NBA, include points, rebounds, and assists. For MLB, include hits, home runs, and stolen bases. Include confidence levels (0-1) and detailed reasoning.`
              }
            ],
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
          }
        );

        if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
          // Parse the AI-generated content and transform it into player props
          const playerProps = this.parseAIPlayerProps(response.data.choices[0].message.content, gameId, sport);
          return playerProps;
        } else {
          console.warn(`No data returned from OpenAI API, using mock data for ${sport} game ${gameId}`);
          return this.getMockPlayerProps(gameId, sport);
        }
      } catch (apiError) {
        console.error(`API error generating player props for ${sport} game ${gameId}:`, apiError);
        return this.getMockPlayerProps(gameId, sport);
      }
    } catch (error) {
      console.error(`Error generating player props for ${sport} game ${gameId}:`, error);
      return this.getMockPlayerProps(gameId, sport);
    }
  }

  /**
   * Parse AI-generated content into structured PlayerProp objects
   */
  private static parseAIPlayerProps(content: string, gameId: string, sport: SportType): PlayerProp[] {
    try {
      // For now, returning mock data since parsing the AI response would require
      // a more complex implementation
      return this.getMockPlayerProps(gameId, sport);
    } catch (error) {
      console.error('Error parsing AI player props:', error);
      return this.getMockPlayerProps(gameId, sport);
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
          gameDate,
          homeTeamId: `home-team-${i}`,
          awayTeamId: `away-team-${i}`,
          homeTeamName: ['Lakers', 'Warriors', 'Celtics', 'Bucks', 'Heat'][i % 5],
          awayTeamName: ['Nets', 'Suns', 'Mavericks', 'Nuggets', '76ers'][i % 5],
          status: 'SCHEDULED',
          predictions: [],
          playerProps: [],
        });
      } else {
        games.push({
          id: `mlb-game-${i}`,
          sport: 'MLB',
          gameDate,
          homeTeamId: `home-team-${i}`,
          awayTeamId: `away-team-${i}`,
          homeTeamName: ['Yankees', 'Dodgers', 'Red Sox', 'Cubs', 'Astros'][i % 5],
          awayTeamName: ['Braves', 'Giants', 'Cardinals', 'Mets', 'Blue Jays'][i % 5],
          status: 'SCHEDULED',
          predictions: [],
          playerProps: [],
        });
      }
    }
    
    return games;
  }

  /**
   * Generate mock predictions for development
   */
  private static getMockPredictions(gameId: string): Prediction[] {
    const predictionTypes: PredictionType[] = ['SPREAD', 'MONEYLINE', 'OVER_UNDER'];
    const predictions: Prediction[] = [];
    
    for (const type of predictionTypes) {
      let value = '';
      let confidence = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
      let reasoning = '';
      
      switch (type) {
        case 'SPREAD':
          value = Math.random() > 0.5 ? 'HOME -5.5' : 'AWAY +5.5';
          reasoning = `Based on recent performance and historical matchups, we predict ${value} with ${(confidence * 100).toFixed(1)}% confidence. The home team has covered the spread in 7 of their last 10 games.`;
          break;
        case 'MONEYLINE':
          value = Math.random() > 0.5 ? 'HOME' : 'AWAY';
          reasoning = `Our models give the ${value} team a ${(confidence * 100).toFixed(1)}% chance of winning based on current form, injuries, and head-to-head statistics.`;
          break;
        case 'OVER_UNDER':
          const total = Math.floor(Math.random() * 30) + 200; // 200-230 for NBA
          value = Math.random() > 0.5 ? `OVER ${total}` : `UNDER ${total}`;
          reasoning = `For the total points, we predict ${value} with ${(confidence * 100).toFixed(1)}% confidence. Recent games between these teams have averaged ${total - 10} points.`;
          break;
      }
      
      predictions.push({
        id: `prediction-${gameId}-${type}`,
        gameId,
        predictionType: type,
        predictionValue: value,
        confidence,
        reasoning,
        createdAt: new Date(),
        game: {} as Game, // This would be populated by the ORM in a real app
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
    
    const propTypes: Record<SportType, PropType[]> = {
      'NBA': ['POINTS', 'REBOUNDS', 'ASSISTS'],
      'MLB': ['HITS', 'HOME_RUNS', 'STOLEN_BASES']
    };
    
    const relevantPlayers = players.slice(0, sport === 'NBA' ? 3 : 2);
    const relevantProps = propTypes[sport];
    
    for (const player of relevantPlayers) {
      for (const propType of relevantProps) {
        let overUnderValue: number;
        let predictionValue: string;
        let confidence = Math.random() * 0.3 + 0.6; // 0.6 to 0.9
        let reasoning = '';
        
        switch (propType) {
          case 'POINTS':
            overUnderValue = 24.5;
            predictionValue = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            reasoning = `${player.name} has averaged 26.3 points in the last 10 games. We predict ${predictionValue} ${overUnderValue} points with ${(confidence * 100).toFixed(1)}% confidence.`;
            break;
          case 'REBOUNDS':
            overUnderValue = 8.5;
            predictionValue = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            reasoning = `${player.name} has averaged 9.1 rebounds in the last 10 games. We predict ${predictionValue} ${overUnderValue} rebounds with ${(confidence * 100).toFixed(1)}% confidence.`;
            break;
          case 'ASSISTS':
            overUnderValue = 6.5;
            predictionValue = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            reasoning = `${player.name} has averaged 7.2 assists in the last 10 games. We predict ${predictionValue} ${overUnderValue} assists with ${(confidence * 100).toFixed(1)}% confidence.`;
            break;
          case 'HITS':
            overUnderValue = 1.5;
            predictionValue = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            reasoning = `${player.name} has averaged 1.8 hits per game. We predict ${predictionValue} ${overUnderValue} hits with ${(confidence * 100).toFixed(1)}% confidence.`;
            break;
          case 'HOME_RUNS':
            overUnderValue = 0.5;
            predictionValue = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            reasoning = `${player.name} has hit home runs in 4 of the last 10 games. We predict ${predictionValue} ${overUnderValue} home runs with ${(confidence * 100).toFixed(1)}% confidence.`;
            break;
          case 'STOLEN_BASES':
            overUnderValue = 0.5;
            predictionValue = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            reasoning = `${player.name} has stolen bases in 3 of the last 10 games. We predict ${predictionValue} ${overUnderValue} stolen bases with ${(confidence * 100).toFixed(1)}% confidence.`;
            break;
          default:
            overUnderValue = 10;
            predictionValue = 'OVER';
            reasoning = 'No specific reasoning available for this prop.';
        }
        
        props.push({
          id: `prop-${gameId}-${player.id}-${propType}`,
          gameId,
          playerId: player.id,
          playerName: player.name,
          teamId: player.teamId,
          propType,
          overUnderValue,
          predictionValue,
          confidence,
          reasoning,
          createdAt: new Date(),
          game: {} as Game, // This would be populated by the ORM in a real app
        });
      }
    }
    
    return props;
  }
} 