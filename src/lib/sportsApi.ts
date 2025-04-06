import axios from 'axios';
import { Game, Prediction, PlayerProp, SportType } from '@/models/types';

export class SportsApiService {
  static async getUpcomingGames(sport: string): Promise<Game[]> {
    try {
      const endpoint = sport === 'NBA' ? '/nba/games' : '/mlb/games';
      const response = await axios.get(endpoint, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_SPORTS_DATA_API_KEY
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming games:', error);
      return [];
    }
  }

  static async getPredictionsForGame(gameId: string): Promise<Prediction[]> {
    try {
      const response = await axios.get(`/predictions/${gameId}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_SPORTS_DATA_API_KEY
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return [];
    }
  }

  static async getPlayerPropsForGame(gameId: string, sport: string): Promise<PlayerProp[]> {
    try {
      const response = await axios.get(`/player-props/${gameId}`, {
        params: { sport },
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_SPORTS_DATA_API_KEY
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching player props:', error);
      return [];
    }
  }
} 