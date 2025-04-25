import axios from 'axios';

export interface WeatherData {
  temperature: number;  // Fahrenheit
  windSpeed: number;    // mph
  windDirection: string; // 'in', 'out', or 'cross'
  precipitation: number; // Probability 0-1
  conditions: string;    // Description
}

interface StadiumLocation {
  lat: number;
  lon: number;
  name: string;
  team: string;
}

// OpenWeatherMap API types
interface WeatherForecast {
  dt: number;
  main: {
    temp: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  weather: Array<{
    description: string;
  }>;
  pop?: number;
}

interface WeatherAPIResponse {
  list: WeatherForecast[];
}

// MLB Stadium coordinates
const MLB_STADIUMS: { [key: string]: StadiumLocation } = {
  'Los Angeles Angels': {
    name: 'Angel Stadium',
    team: 'Los Angeles Angels',
    lat: 33.8003,
    lon: -117.8827
  },
  'Arizona Diamondbacks': {
    name: 'Chase Field',
    team: 'Arizona Diamondbacks',
    lat: 33.4453,
    lon: -112.0667
  },
  'Atlanta Braves': {
    name: 'Truist Park',
    team: 'Atlanta Braves',
    lat: 33.8907,
    lon: -84.4677
  },
  'Baltimore Orioles': {
    name: 'Oriole Park at Camden Yards',
    team: 'Baltimore Orioles',
    lat: 39.2838,
    lon: -76.6215
  },
  'Boston Red Sox': {
    name: 'Fenway Park',
    team: 'Boston Red Sox',
    lat: 42.3467,
    lon: -71.0972
  }
  // Add other MLB stadiums as needed
};

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_API_ENDPOINT = 'https://api.openweathermap.org/data/2.5/forecast';

function determineWindDirection(degrees: number, stadium: StadiumLocation): string {
  // This would need to be customized for each stadium's specific layout
  // For now, using a simplified model:
  // out: wind blowing from home plate to outfield (135-225 degrees)
  // in: wind blowing from outfield to home plate (315-45 degrees)
  // cross: wind blowing across the field
  
  if (degrees >= 135 && degrees <= 225) return 'out';
  if (degrees >= 315 || degrees <= 45) return 'in';
  return 'cross';
}

function kelvinToFahrenheit(kelvin: number): number {
  return ((kelvin - 273.15) * 9/5) + 32;
}

export async function getGameWeather(homeTeam: string, gameTime: Date): Promise<WeatherData | null> {
  try {
    const stadium = MLB_STADIUMS[homeTeam];
    if (!stadium) {
      console.error(`No stadium data found for team: ${homeTeam}`);
      return null;
    }

    const response = await axios.get<WeatherAPIResponse>(WEATHER_API_ENDPOINT, {
      params: {
        lat: stadium.lat,
        lon: stadium.lon,
        appid: WEATHER_API_KEY,
        units: 'standard' // Kelvin
      }
    });

    // Find the forecast closest to game time
    const forecasts = response.data.list;
    let closestForecast = forecasts[0];
    let smallestDiff = Math.abs(new Date(forecasts[0].dt * 1000).getTime() - gameTime.getTime());

    for (const forecast of forecasts) {
      const diff = Math.abs(new Date(forecast.dt * 1000).getTime() - gameTime.getTime());
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestForecast = forecast;
      }
    }

    const windDirection = determineWindDirection(closestForecast.wind.deg, stadium);
    
    return {
      temperature: Math.round(kelvinToFahrenheit(closestForecast.main.temp)),
      windSpeed: Math.round(closestForecast.wind.speed * 2.237), // Convert m/s to mph
      windDirection,
      precipitation: closestForecast.pop || 0, // Probability of precipitation
      conditions: closestForecast.weather[0].description
    };

  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

export function getWeatherImpact(weather: WeatherData): {
  total: number;
  confidence: number;
  explanation: string;
} {
  let impact = 0;
  let confidence = 0.7;
  const factors: string[] = [];

  // Temperature impact
  if (weather.temperature > 80) {
    impact += 0.4;
    confidence += 0.05;
    factors.push('Hot weather (+0.4 runs)');
  } else if (weather.temperature < 50) {
    impact -= 0.4;
    confidence += 0.05;
    factors.push('Cold weather (-0.4 runs)');
  }

  // Wind impact
  if (weather.windSpeed > 10) {
    if (weather.windDirection === 'out') {
      impact += 0.5;
      confidence += 0.05;
      factors.push(`Strong outward wind +0.5 runs (${weather.windSpeed} mph)`);
    } else if (weather.windDirection === 'in') {
      impact -= 0.5;
      confidence += 0.05;
      factors.push(`Strong inward wind -0.5 runs (${weather.windSpeed} mph)`);
    }
  }

  // Precipitation impact
  if (weather.precipitation > 0.5) {
    impact -= 0.3;
    confidence += 0.05;
    factors.push('High chance of precipitation (-0.3 runs)');
  }

  // Cap confidence at 0.95
  confidence = Math.min(confidence, 0.95);

  return {
    total: Math.round(impact * 2) / 2, // Round to nearest 0.5
    confidence,
    explanation: factors.join(', ')
  };
} 