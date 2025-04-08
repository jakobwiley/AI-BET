import axios from 'axios';
import { Game, Prediction, PredictionResponse, SportType } from '@/models/types';

export class SportsApiService {
  private static readonly API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'test-api-key';
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

  private static getHeaders() {
    return {
      headers: {
        'x-api-key': this.API_KEY,
      },
    };
  }

  static async getUpcomingGames(sport: SportType): Promise<Game[]> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/${sport.toLowerCase()}/games`,
        this.getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${sport} games:`, error);
      return [];
    }
  }

  static async getPredictionsForGame(gameId: string): Promise<Prediction[]> {
    try {
      const response = await axios.get<Prediction[]>(
        `${this.BASE_URL}/predictions/${gameId}`,
        this.getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return [];
    }
  }

  static async getPlayerPropsForGame(gameId: string, sport: SportType): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/player-props/${gameId}`,
        {
          ...this.getHeaders(),
          params: { sport },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching player props:', error);
      return [];
    }
  }
} 