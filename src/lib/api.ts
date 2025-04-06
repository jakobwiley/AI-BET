import axios from 'axios';
import { SportType } from '@/models/types';

export class SportsDataApi {
  private static baseUrl = 'https://api.sportsdata.io/v3';
  private static apiKey = process.env.NEXT_PUBLIC_SPORTS_DATA_API_KEY;

  static async getUpcomingGames(sport: string): Promise<any[]> {
    try {
      const endpoint = sport === 'NBA' 
        ? `${this.baseUrl}/nba/scores/json/Games/2024` 
        : `${this.baseUrl}/mlb/scores/json/Games/2024`;
      
      const response = await axios.get(endpoint, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${sport} games:`, error);
      return [];
    }
  }
}

export class TheOddsApi {
  private static baseUrl = 'https://api.the-odds-api.com/v4';
  private static apiKey = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;

  static async getOdds(sport: string): Promise<any[]> {
    try {
      const sportKey = sport === 'NBA' ? 'basketball_nba' : 'baseball_mlb';
      const endpoint = `${this.baseUrl}/sports/${sportKey}/odds`;
      
      const response = await axios.get(endpoint, {
        params: {
          apiKey: this.apiKey,
          regions: 'us',
          markets: 'spreads,h2h,totals',
          oddsFormat: 'american'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${sport} odds:`, error);
      return [];
    }
  }
}

interface PredictionRequest {
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDate: string;
}

export class OpenAiApi {
  private static baseUrl = 'https://api.openai.com/v1';
  private static apiKey = process.env.OPENAI_API_KEY;

  static async generatePredictions(gameData: PredictionRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a sports prediction AI that provides betting predictions based on game data and historical performance.'
            },
            {
              role: 'user',
              content: `Generate betting predictions for this game:
                Sport: ${gameData.sport}
                Home Team: ${gameData.homeTeam}
                Away Team: ${gameData.awayTeam}
                Game Date: ${gameData.gameDate}
                
                Please provide predictions for spread, moneyline, and total with confidence levels and reasoning.
                Format your response as JSON with this structure:
                {
                  "predictions": [
                    {
                      "type": "SPREAD" | "MONEYLINE" | "TOTAL",
                      "value": "string",
                      "confidence": number between 0 and 1,
                      "reasoning": "string"
                    }
                  ]
                }
                `
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error generating predictions:', error);
      return { predictions: [] };
    }
  }
} 