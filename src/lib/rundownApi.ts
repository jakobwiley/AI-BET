import axios from 'axios';
import { SportType, GameStatus } from '@prisma/client';
import type { Game } from '@prisma/client';

interface AxiosError extends Error {
  response?: {
    status: number;
    data: any;
  };
}

// API configuration
const RAPIDAPI_HOST = 'therundown-therundown-v1.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
if (!RAPIDAPI_KEY) {
  throw new Error('RAPIDAPI_KEY environment variable is not set');
}
const AFFILIATE_ID = '19';

// Sport IDs in The Rundown API
const SPORT_IDS = {
  MLB: 3,
  NBA: 4,
  NFL: 1,
  NHL: 5,
  NCAAF: 2,
  NCAAB: 6,
};

// Interface for The Rundown API response
interface RundownTeam {
  team_id: number;
  team_normalized_id: number;
  name: string;
  is_away: boolean;
  is_home: boolean;
  abbreviation?: string;
  record?: string;
}

interface RundownScore {
  event_id: string;
  event_status: string;
  winner_away: number;
  winner_home: number;
  score_away: number;
  score_home: number;
  score_away_by_period: number[];
  score_home_by_period: number[];
  venue_name: string;
  venue_location: string;
  game_clock: number;
  display_clock: string;
  game_period: number;
  broadcast: string;
  event_status_detail: string;
  updated_at: string;
}

interface RundownLines {
  line_id: number;
  moneyline: {
    moneyline_away: number;
    moneyline_away_delta: number;
    moneyline_home: number;
    moneyline_home_delta: number;
    moneyline_draw: number;
    moneyline_draw_delta: number;
    line_id: number;
    event_id: string;
    sport_id: number;
    affiliate_id: number;
    date_updated: string;
    format: string;
  };
  spread: {
    point_spread_away: number;
    point_spread_home: number;
    point_spread_away_delta: number;
    point_spread_home_delta: number;
    point_spread_away_money: number;
    point_spread_away_money_delta: number;
    point_spread_home_money: number;
    point_spread_home_money_delta: number;
    line_id: number;
    event_id: string;
    sport_id: number;
    affiliate_id: number;
    date_updated: string;
    format: string;
  };
  total: {
    total_over: number;
    total_over_delta: number;
    total_under: number;
    total_under_delta: number;
    total_over_money: number;
    total_over_money_delta: number;
    total_under_money: number;
    total_under_money_delta: number;
    line_id: number;
    event_id: string;
    sport_id: number;
    affiliate_id: number;
    date_updated: string;
    format: string;
  };
  affiliate: {
    affiliate_id: number;
    affiliate_name: string;
    affiliate_url: string;
  };
}

interface RundownEvent {
  event_id: string;
  event_uuid: string;
  sport_id: number;
  event_date: string;
  rotation_number_away: number;
  rotation_number_home: number;
  score: RundownScore;
  teams: RundownTeam[];
  teams_normalized: RundownTeam[];
  schedule: {
    league_name: string;
    conference_competition: boolean;
    season_type: string;
    season_year: number;
    event_name: string;
    attendance: string;
  };
  lines: {
    [key: string]: RundownLines;
  };
}

interface RundownResponse {
  meta: {
    delta_last_id: string;
  };
  events: RundownEvent[];
}

export class RundownApiService {
  /**
   * Fetch games for a specific date
   * @param date Date in YYYY-MM-DD format
   * @param sport Sport type (MLB, NBA, etc.)
   * @returns Array of games with odds
   */
  static async getGamesByDate(date: string, sport: SportType): Promise<RundownEvent[]> {
    try {
      const sportId = SPORT_IDS[sport];
      if (!sportId) {
        throw new Error(`Unsupported sport: ${sport}`);
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }

      const url = `https://therundown-therundown-v1.p.rapidapi.com/sports/${sportId}/events/${date}`;
      
      console.log(`Fetching ${sport} games from ${url}`);
      
      const response = await axios.get<RundownResponse>(url, {
        params: {
          include: ['all_periods', 'scores', 'teams', 'odds'].join(','),
          affiliate_ids: AFFILIATE_ID,
          offset: 0,
        },
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      });

      if (response.data.events.length === 0) {
        console.log(`No ${sport} games found for ${date}`);
      } else {
        console.log(`Found ${response.data.events.length} ${sport} games for ${date}`);
      }

      return response.data.events;
    } catch (error: unknown) {
      if (error instanceof Error && 'isAxiosError' in error) {
        const axiosError = error as any;
        console.error(`[RundownAPI] Error fetching ${sport} games:`);
        console.error(`URL: ${axiosError.config?.url}`);
        console.error(`Params: ${JSON.stringify(axiosError.config?.params)}`);
        console.error(`Response Status: ${axiosError.response?.status}`);
        console.error(`Response Data: ${JSON.stringify(axiosError.response?.data)}`);
      } else {
        console.error(`[RundownAPI] Unexpected error fetching ${sport} games:`, error);
      }
      return [];
    }
  }

  /**
   * Convert Rundown event to our Game format
   * @param event Rundown event
   * @returns Game object in our format
   */
  static convertToGameFormat(rundownGame: RundownEvent): Game {
    const homeTeam = rundownGame.teams_normalized.find(t => t.is_home);
    const awayTeam = rundownGame.teams_normalized.find(t => t.is_away);

    if (!homeTeam || !awayTeam) {
      throw new Error('Could not find home or away team in normalized data');
    }

    // Convert Rundown status to GameStatus enum
    let gameStatus: GameStatus = 'SCHEDULED';
    const status = rundownGame.score?.event_status?.toUpperCase() || '';
    if (status.includes('IN_PROGRESS') || status.includes('INPROGRESS')) {
      gameStatus = 'IN_PROGRESS';
    } else if (status.includes('FINAL') || status.includes('COMPLETE')) {
      gameStatus = 'FINAL';
    } else if (status.includes('POSTPONED')) {
      gameStatus = 'POSTPONED';
    } else if (status.includes('CANCELLED') || status.includes('CANCELED')) {
      gameStatus = 'CANCELLED';
    }

    const now = new Date();
    const sportType = rundownGame.sport_id === 3 ? 'MLB' : 'NBA';
    
    return {
      id: rundownGame.event_id,
      sport: sportType,
      homeTeamId: homeTeam.team_id.toString(),
      awayTeamId: awayTeam.team_id.toString(),
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      gameDate: new Date(rundownGame.event_date),
      startTime: rundownGame.event_date.split('T')[1].substring(0, 5),
      status: gameStatus,
      oddsJson: JSON.stringify(rundownGame.lines || {}),
      homeScore: rundownGame.score?.score_home || null,
      awayScore: rundownGame.score?.score_away || null,
      createdAt: now,
      updatedAt: now,
      probableHomePitcherId: null,
      probableAwayPitcherId: null
    };
  }

  /**
   * Get all games for today
   * @param sports Array of sports to fetch (default: MLB, NBA)
   * @returns Array of games
   */
  static async getTodaysGames(sports: SportType[] = [SportType.MLB, SportType.NBA]) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const allGames = [];
    
    for (const sport of sports) {
      const games = await this.getGamesByDate(dateStr, sport);
      const convertedGames = games.map(game => this.convertToGameFormat(game));
      allGames.push(...convertedGames);
    }
    
    return allGames;
  }
} 