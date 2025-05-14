import axios from 'axios';
import { MLBStatsService } from '../mlbStatsApi.js';
import { CacheService } from '../cacheService.js';

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  humidity: number;
  conditions: string;
}

interface UmpireStats {
  name: string;
  gamesCalled: number;
  homeTeamWinPercentage: number;
  averageRunsPerGame: number;
  strikeZoneConsistency: number;
  tendencies: {
    favorsHomeTeam: boolean;
    favorsPitchers: boolean;
    tightStrikeZone: boolean;
  };
}

interface TeamTravelInfo {
  lastGameDate: string;
  lastGameLocation: string;
  nextGameLocation: string;
  restDays: number;
  travelDistance: number;
  timeZoneChange: number;
}

interface HistoricalPerformance {
  last30Days: {
    wins: number;
    losses: number;
    runsScored: number;
    runsAllowed: number;
  };
  last7Days: {
    wins: number;
    losses: number;
    runsScored: number;
    runsAllowed: number;
  };
}

interface WeatherAPIResponse {
  forecast: {
    forecastday: Array<{
      day: {
        avgtemp_f: number;
        maxwind_mph: number;
        totalprecip_in: number;
        avghumidity: number;
        condition: {
          text: string;
        };
      };
      hour: Array<{
        wind_dir: string;
      }>;
    }>;
  };
}

export class EnhancedMLBDataService {
  private static readonly WEATHER_API_KEY = process.env.WEATHER_API_KEY;
  private static readonly WEATHER_API_URL = 'https://api.weatherapi.com/v1/forecast.json';

  static async getHistoricalPerformance(teamId: string): Promise<HistoricalPerformance | null> {
    const cacheKey = `historical_performance_${teamId}`;
    const cached = CacheService.get<HistoricalPerformance>(cacheKey);
    if (cached) return cached;

    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [last30Days, last7Days] = await Promise.all([
        MLBStatsService.getTeamStats(teamId),
        MLBStatsService.getTeamStats(teamId)
      ]);

      const performance: HistoricalPerformance = {
        last30Days: {
          wins: last30Days?.wins || 0,
          losses: last30Days?.losses || 0,
          runsScored: last30Days?.runsScored || 0,
          runsAllowed: last30Days?.runsAllowed || 0
        },
        last7Days: {
          wins: last7Days?.wins || 0,
          losses: last7Days?.losses || 0,
          runsScored: last7Days?.runsScored || 0,
          runsAllowed: last7Days?.runsAllowed || 0
        }
      };

      CacheService.set(cacheKey, performance, 3600); // Cache for 1 hour
      return performance;
    } catch (error) {
      console.error('Error fetching historical performance:', error);
      return null;
    }
  }

  static async getWeatherData(gameDate: string, location: string): Promise<WeatherData | null> {
    const cacheKey = `weather_${location}_${gameDate}`;
    const cached = CacheService.get<WeatherData>(cacheKey);
    if (cached) return cached;

    if (!this.WEATHER_API_KEY) {
      console.warn('Weather API key not configured');
      return null;
    }

    try {
      const response = await axios.get<WeatherAPIResponse>(this.WEATHER_API_URL, {
        params: {
          key: this.WEATHER_API_KEY,
          q: location,
          dt: gameDate,
          aqi: 'no'
        }
      });

      const forecast = response.data.forecast.forecastday[0];
      const weatherData: WeatherData = {
        temperature: forecast.day.avgtemp_f,
        windSpeed: forecast.day.maxwind_mph,
        windDirection: forecast.hour[12].wind_dir,
        precipitation: forecast.day.totalprecip_in,
        humidity: forecast.day.avghumidity,
        conditions: forecast.day.condition.text
      };

      CacheService.set(cacheKey, weatherData, 3600); // Cache for 1 hour
      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  static async getUmpireStats(gameId: string): Promise<UmpireStats | null> {
    const cacheKey = `umpire_${gameId}`;
    const cached = CacheService.get<UmpireStats>(cacheKey);
    if (cached) return cached;

    try {
      // TODO: Implement umpire stats API integration
      // This would require a new API endpoint or data source
      return null;
    } catch (error) {
      console.error('Error fetching umpire stats:', error);
      return null;
    }
  }

  static async getTeamTravelInfo(teamId: string, gameDate: string): Promise<TeamTravelInfo | null> {
    const cacheKey = `travel_${teamId}_${gameDate}`;
    const cached = CacheService.get<TeamTravelInfo>(cacheKey);
    if (cached) return cached;

    try {
      const lastGame = await MLBStatsService.getLastGame(teamId);
      if (!lastGame) return null;

      const lastGameDate = new Date(lastGame.date);
      const gameDateObj = new Date(gameDate);
      const restDays = Math.floor((gameDateObj.getTime() - lastGameDate.getTime()) / (24 * 60 * 60 * 1000));

      // Calculate travel distance and time zone change
      // This would require a ballpark location database
      const travelDistance = 0; // TODO: Implement distance calculation
      const timeZoneChange = 0; // TODO: Implement time zone calculation

      const travelInfo: TeamTravelInfo = {
        lastGameDate: lastGame.date,
        lastGameLocation: lastGame.location,
        nextGameLocation: lastGame.nextGameLocation,
        restDays,
        travelDistance,
        timeZoneChange
      };

      CacheService.set(cacheKey, travelInfo, 3600); // Cache for 1 hour
      return travelInfo;
    } catch (error) {
      console.error('Error fetching team travel info:', error);
      return null;
    }
  }
} 