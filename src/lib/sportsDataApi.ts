import axios from 'axios';
import { SportType, PlayerProp } from '@/models/types';
import { v4 as uuidv4 } from 'uuid';

// Using free public APIs for NBA and MLB data
const NBA_API_BASE_URL = 'https://www.balldontlie.io/api/v1';
const MLB_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';

export class SportsDataApiService {
  // Get teams for a specific sport
  static async getTeams(sport: SportType) {
    try {
      let response;
      
      if (sport === 'NBA') {
        response = await axios.get(`${NBA_API_BASE_URL}/teams`);
        return response.data.data;
      } else if (sport === 'MLB') {
        response = await axios.get(`${MLB_API_BASE_URL}/teams`);
        return response.data.teams;
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching ${sport} teams:`, error);
      return [];
    }
  }
  
  // Get player information for a team
  static async getPlayersByTeam(sport: SportType, teamId: string) {
    try {
      let response;
      
      if (sport === 'NBA') {
        response = await axios.get(`${NBA_API_BASE_URL}/players`, {
          params: {
            team_ids: [teamId],
            per_page: 100
          }
        });
        return response.data.data;
      } else if (sport === 'MLB') {
        response = await axios.get(`${MLB_API_BASE_URL}/teams/${teamId}/roster/active`);
        return response.data.roster;
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching ${sport} players for team ${teamId}:`, error);
      return [];
    }
  }
  
  // Get player stats 
  static async getPlayerStats(sport: SportType, playerId: string) {
    try {
      let response;
      
      if (sport === 'NBA') {
        response = await axios.get(`${NBA_API_BASE_URL}/season_averages`, {
          params: {
            player_ids: [playerId]
          }
        });
        return response.data.data[0];
      } else if (sport === 'MLB') {
        response = await axios.get(`${MLB_API_BASE_URL}/people/${playerId}/stats/game/current`);
        return response.data.stats;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching ${sport} stats for player ${playerId}:`, error);
      return null;
    }
  }
  
  // Get team logos (using more reliable sources)
  static getTeamLogoUrl(sport: SportType, teamId: string, teamName: string) {
    if (sport === 'NBA') {
      // Use ESPN CDN format which is more reliable for NBA
      return `https://a.espncdn.com/i/teamlogos/nba/500/${teamId.toLowerCase()}.png`;
    } else if (sport === 'MLB') {
      // Use ESPN CDN for MLB logos
      return `https://a.espncdn.com/i/teamlogos/mlb/500/${teamId}.png`;
    }
    
    // Fallback to a generic logo based on team name
    return `/api/placeholder?text=${encodeURIComponent(teamName.split(' ').map(word => word[0]).join(''))}&color=white`;
  }
  
  // Get player images (using free public sources)
  static getPlayerImageUrl(sport: SportType, playerId: string, playerName: string) {
    if (sport === 'NBA') {
      // NBA player images
      return `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
    } else if (sport === 'MLB') {
      // MLB player images
      return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;
    }
    
    // Fallback to a generic player image
    return `https://www.gravatar.com/avatar/?d=mp`;
  }
  
  // Get scheduled games from the sports data APIs
  static async getUpcomingGames(sport: SportType, days: number = 7) {
    try {
      let response;
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + days);
      
      const formattedToday = today.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      if (sport === 'NBA') {
        response = await axios.get(`${NBA_API_BASE_URL}/games`, {
          params: {
            start_date: formattedToday,
            end_date: formattedEndDate,
            per_page: 100
          }
        });
        
        // Transform to match our Game model
        return response.data.data.map((game: any) => ({
          id: game.id.toString(),
          sport: 'NBA',
          homeTeamId: game.home_team.id.toString(),
          awayTeamId: game.visitor_team.id.toString(),
          homeTeamName: game.home_team.full_name,
          awayTeamName: game.visitor_team.full_name,
          startTime: new Date(game.date),
          status: game.status
        }));
      } else if (sport === 'MLB') {
        response = await axios.get(`${MLB_API_BASE_URL}/schedule`, {
          params: {
            sportId: 1,
            startDate: formattedToday,
            endDate: formattedEndDate
          }
        });
        
        // Transform to match our Game model
        const games: any[] = [];
        response.data.dates.forEach((date: any) => {
          date.games.forEach((game: any) => {
            games.push({
              id: game.gamePk.toString(),
              sport: 'MLB',
              homeTeamId: game.teams.home.team.id.toString(),
              awayTeamId: game.teams.away.team.id.toString(),
              homeTeamName: game.teams.home.team.name,
              awayTeamName: game.teams.away.team.name,
              startTime: new Date(game.gameDate),
              status: game.status.abstractGameState
            });
          });
        });
        
        return games;
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching upcoming ${sport} games:`, error);
      return [];
    }
  }
  
  // Get game details including stats
  static async getGameDetails(sport: SportType, gameId: string) {
    try {
      let response;
      
      if (sport === 'NBA') {
        response = await axios.get(`${NBA_API_BASE_URL}/games/${gameId}`);
        return response.data;
      } else if (sport === 'MLB') {
        response = await axios.get(`${MLB_API_BASE_URL}/game/${gameId}/boxscore`);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching ${sport} game details for game ${gameId}:`, error);
      return null;
    }
  }
  
  // Add getPlayerProps method that returns empty array for now
  public static async getPlayerProps(gameId: string, sport: SportType): Promise<PlayerProp[]> {
    console.log(`[SportsDataAPI] Fetching player props for game ${gameId} (${sport})`);
    
    // For now, return empty array or mock data
    // In a real implementation, this would fetch from a sports data provider
    return [];
  }
} 