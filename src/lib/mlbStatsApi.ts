import axios from 'axios';
import { TeamStats, H2HStats } from './predictionService';

interface MLBTeam {
  id: number;
  name: string;
  teamName: string;
  locationName: string;
  division: {
    id: number;
    name: string;
  };
  league: {
    id: number;
    name: string;
  };
}

interface MLBGame {
  gamePk: number;
  teams: {
    home: {
      team: MLBTeam;
      score: number;
      isWinner: boolean;
      probablePitcher?: {
        id: number;
        fullName: string;
      };
    };
    away: {
      team: MLBTeam;
      score: number;
      isWinner: boolean;
      probablePitcher?: {
        id: number;
        fullName: string;
      };
    };
  };
  gameDate: string;
  status: {
    abstractGameState: string;
  };
}

interface MLBTeamStats {
  stats: Array<{
    splits: Array<{
      stat: {
        gamesPlayed: number;
        wins: number;
        losses: number;
        runsScored: number;
        runsAllowed: number;
        homeWins?: number;
        homeLosses?: number;
        awayWins?: number;
        awayLosses?: number;
      };
    }>;
  }>;
}

// Add interface for Pitching stats within the split
interface MLBPitchingStats {
    era?: string; 
    whip?: string;
    runsAllowed?: number;
    // Add other relevant pitching stats if needed
}

// Interface for specific stat splits like vsLeft/vsRight
interface MLBBattingSplitStats {
    avg?: string; // Batting Average
    ops?: string; // On-base + Slugging
    // Add runsScored, homeRuns etc. if needed per split
}

// Update MLBTeamStats to potentially include pitching group
interface MLBTeamStatsResponse {
  stats: Array<{
    group?: { displayName: string }; 
    splits: Array<{
      // Existing stat structure for overall/home/away/lastX
      stat: {
        gamesPlayed?: number;
        wins?: number;
        losses?: number;
        runsScored?: number;
        runsAllowed?: number;
        era?: string;
        whip?: string;
        homeWins?: number;
        homeLosses?: number;
        awayWins?: number;
        awayLosses?: number;
        // Specific batting stats for vs L/R might be nested here too
        avg?: string; 
        ops?: string;
      };
      // Split details tell us what kind of split it is
      split?: { 
        type?: string; // e.g., 'season', 'vsLeft', 'vsRight'
        isHome?: boolean;
        isAway?: boolean;
        statType?: string;
        numGames?: number;
      };
    }>;
  }>;
}

// Renamed and exported
export interface PitcherStats {
  era?: string;
  whip?: string;
  wins?: number;
  losses?: number;
  strikeOuts?: number;
  walks?: number;
  inningsPitched?: string;
}

interface MLBPitcherStatsResponse {
  stats: Array<{ type: { displayName: string }, group: { displayName: string }, splits: Array<{ stat: PitcherStats }> }>
}

// Interface for pitcher details (including handedness)
export interface PitcherDetails {
    id: number;
    fullName: string;
    primaryPosition: { code: string; abbreviation: string; }; // e.g., '1' for Pitcher
    pitchHand: { code: 'L' | 'R'; description: string };
    // Add other useful details if needed
}

// Interface for the /people/{id} endpoint response
interface MLBPersonResponse {
    people: PitcherDetails[];
}

const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const CURRENT_MLB_SEASON = 2024; // Use current season data

interface MLBTeamRecord {
  records: Array<{
    wins: number;
    losses: number;
    homeWins: number;
    homeLosses: number;
    awayWins: number;
    awayLosses: number;
    lastTenGames: string;
    streak: number;
    winPercentage: number;
    lastTenWins: number;
  }>;
}

interface MLBScheduleResponse {
  dates: Array<{
    games: MLBGame[];
  }>;
}

export class MLBStatsService {
  private static teamIdMap: Map<string, number> | null = null;
  private static teamFetchPromise: Promise<void> | null = null;
  private static pitcherStatsCache: Record<string, { data: PitcherStats | null, timestamp: number }> = {};
  private static PITCHER_CACHE_DURATION = 6 * 60 * 60 * 1000; // Cache pitcher stats for 6 hours
  private static pitcherDetailsCache: Record<string, { data: PitcherDetails | null, timestamp: number }> = {};
  private static PITCHER_DETAILS_CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache details for 24 hours

  private static async initializeTeamIdMap(): Promise<void> {
    try {
        const response = await axios.get(`${BASE_URL}/teams`, {
            params: { sportId: 1, season: CURRENT_MLB_SEASON }
        });
        
        const data = response.data as { teams: MLBTeam[] };
        this.teamIdMap = new Map();
        data.teams.forEach(team => {
            this.teamIdMap?.set(team.name.toLowerCase(), team.id);
            this.teamIdMap?.set(team.teamName.toLowerCase(), team.id);
            this.teamIdMap?.set(team.locationName.toLowerCase(), team.id);
        });
        
        console.log(`[MLBStatsService] Initialized team ID map with ${this.teamIdMap.size} entries.`);
    } catch (error) {
        console.error('[MLBStatsService] Error initializing team ID map:', error);
        this.teamIdMap = null;
    }
  }

  private static async getTeamId(teamName: string): Promise<number | null> {
    await this.initializeTeamIdMap();
    const normalizedName = teamName.toLowerCase();
    const teamId = this.teamIdMap?.get(normalizedName);
    if (teamId === undefined || teamId === null) {
      console.error(`[MLBStatsService] Team ID not found for: "${teamName}" (Normalized: "${normalizedName}").`);
      return null;
    }
    return teamId;
  }

  private static parseFloatStat(stat: string | undefined): number | undefined {
    if (stat === undefined) return undefined;
    const num = parseFloat(stat);
    return isNaN(num) ? undefined : num;
  }

  public static async getTeamStats(teamName: string): Promise<TeamStats | null> {
    const teamId = await this.getTeamId(teamName);
    if (!teamId) { 
        console.error(`[MLBStatsService] Cannot fetch stats for ${teamName} due to missing ID.`);
        return null; 
    }

    console.log(`[MLBStatsService] Fetching stats for ${teamName} (ID: ${teamId}) for season ${CURRENT_MLB_SEASON}`);
    try {
      const standingsResponse = await axios.get<any>(`${BASE_URL}/standings`, {
        params: {
          leagueId: '103,104',
          season: CURRENT_MLB_SEASON,
          teamId: teamId,
          standingsTypes: 'regularSeason'
        }
      });
      
      const teamRecord = standingsResponse.data.records.find((r: any) => 
        r.teamRecords.some((tr: any) => tr.team.id === teamId)
      )?.teamRecords.find((tr: any) => tr.team.id === teamId);

      if (!teamRecord) {
        console.warn(`[MLBStatsService] Could not find team record for ${teamName}`);
        return null;
      }

      const splitRecords = teamRecord.records?.splitRecords || [];
      const homeRecord = splitRecords.find((r: any) => r.type === 'home') || {};
      const awayRecord = splitRecords.find((r: any) => r.type === 'away') || {};
      const lastTenRecord = splitRecords.find((r: any) => r.type === 'lastTen') || {};

      const stats: TeamStats = {
        wins: teamRecord.wins || 0,
        losses: teamRecord.losses || 0,
        homeWins: homeRecord.wins || 0,
        homeLosses: homeRecord.losses || 0,
        awayWins: awayRecord.wins || 0,
        awayLosses: awayRecord.losses || 0,
        pointsFor: teamRecord.runsScored || 0,
        pointsAgainst: teamRecord.runsAllowed || 0,
        lastTenGames: `${lastTenRecord.wins || 0}-${lastTenRecord.losses || 0}`,
        streak: teamRecord.streak?.streakNumber || 0,
        winPercentage: teamRecord.winningPercentage || 0,
        lastTenWins: lastTenRecord.wins || 0,
        avgRunsScored: (teamRecord.runsScored || 0) / (teamRecord.gamesPlayed || 1),
        avgRunsAllowed: (teamRecord.runsAllowed || 0) / (teamRecord.gamesPlayed || 1)
      };

      return stats;

    } catch (error: any) {
      console.error(`[MLBStatsService] Error in getTeamStats API call for ${teamName}:`, error.message);
      if (error instanceof Error && 'isAxiosError' in error) {
         const axiosError = error as any;
         console.error(`[MLBStatsService] URL: ${axiosError.config?.url}`);
         console.error(`[MLBStatsService] Params: ${JSON.stringify(axiosError.config?.params)}`);
         console.error(`[MLBStatsService] Response Status: ${axiosError.response?.status}`);
      }
      return null;
    }
  }

  public static async getH2HStats(homeTeamName: string, awayTeamName: string): Promise<H2HStats | null> {
    const [homeTeamId, awayTeamId] = await Promise.all([
        this.getTeamId(homeTeamName),
        this.getTeamId(awayTeamName)
    ]);
    if (!homeTeamId || !awayTeamId) return null;
    console.log(`[MLBStatsService] Fetching H2H stats for ${homeTeamName} vs ${awayTeamName} for season ${CURRENT_MLB_SEASON}`);
    try {
      const response = await axios.get(`${BASE_URL}/schedule`, {
        params: { teamId: homeTeamId, opponentId: awayTeamId, season: CURRENT_MLB_SEASON, sportId: 1, gameType: 'R', fields: 'dates,games,status,teams,score' }
      });
      const data = response.data as MLBScheduleResponse;
      const h2hGames = data.dates.flatMap(date => date.games).filter(game => game.status.abstractGameState === 'Final');
      if (h2hGames.length === 0) {
          console.warn(`[MLBStatsService] No completed H2H games found between ${homeTeamName} and ${awayTeamName} in season ${CURRENT_MLB_SEASON}`);
          return {
              totalGames: 0,
              homeTeamWins: 0,
              awayTeamWins: 0,
              averageRunsDiff: 0,
              lastMeetingDate: '',
              lastMeetingResult: 'No previous meetings'
          };
      }
      const stats: H2HStats = {
          totalGames: h2hGames.length,
          homeTeamWins: 0,
          awayTeamWins: 0,
          averageRunsDiff: 0,
          lastMeetingDate: h2hGames[h2hGames.length - 1].gameDate,
          lastMeetingResult: ''
      };
      let totalRunsDiff = 0;
      h2hGames.forEach(game => {
        const gameHomeTeamId = game.teams.home.team.id;
        const gameHomeScore = game.teams.home.score;
        const gameAwayScore = game.teams.away.score;
        let currentHomeTeamScore, currentAwayTeamScore;
        if (gameHomeTeamId === homeTeamId) {
            currentHomeTeamScore = gameHomeScore;
            currentAwayTeamScore = gameAwayScore;
            if (currentHomeTeamScore > currentAwayTeamScore) {
                stats.homeTeamWins++;
                stats.lastMeetingResult = `${homeTeamName} won ${currentHomeTeamScore}-${currentAwayTeamScore}`;
            } else {
                stats.awayTeamWins++;
                stats.lastMeetingResult = `${awayTeamName} won ${currentAwayTeamScore}-${currentHomeTeamScore}`;
            }
        } else {
            currentHomeTeamScore = gameAwayScore;
            currentAwayTeamScore = gameHomeScore;
            if (currentHomeTeamScore > currentAwayTeamScore) {
                stats.homeTeamWins++;
                stats.lastMeetingResult = `${homeTeamName} won ${currentHomeTeamScore}-${currentAwayTeamScore}`;
            } else {
                stats.awayTeamWins++;
                stats.lastMeetingResult = `${awayTeamName} won ${currentAwayTeamScore}-${currentHomeTeamScore}`;
            }
        }
        totalRunsDiff += (currentHomeTeamScore - currentAwayTeamScore);
      });
      stats.averageRunsDiff = totalRunsDiff / stats.totalGames;
      return stats;
    } catch (error: any) {
      console.error(`[MLBStatsService] Error fetching MLB H2H stats for ${homeTeamName} vs ${awayTeamName}:`, error.message);
      return null; 
    }
  }
  
  public static async getPitcherStats(pitcherId: number): Promise<PitcherStats | null> {
     console.log(`[MLBStatsService] Fetching stats for pitcher ID: ${pitcherId}, Season: ${CURRENT_MLB_SEASON}`);
      try {
          const response = await axios.get<MLBPitcherStatsResponse>(`${BASE_URL}/people/${pitcherId}/stats`, {
              params: { stats: 'season', group: 'pitching', season: CURRENT_MLB_SEASON }
          });
          const stats = response.data.stats?.[0]?.splits?.[0]?.stat;
          if (!stats) {
              console.warn(`[MLBStatsService] No stats found for pitcher ${pitcherId}`); return null;
          }
          return stats;
      } catch (error) {
          console.error(`[MLBStatsService] Error fetching pitcher stats for ID ${pitcherId}:`, error); return null;
      }
  }
  public static async getPitcherDetails(pitcherId: number): Promise<PitcherDetails | null> {
      console.log(`[MLBStatsService] Fetching details for pitcher ID: ${pitcherId}`);
      try {
          const response = await axios.get<MLBPersonResponse>(`${BASE_URL}/people/${pitcherId}`, {
              params: { fields: 'id,fullName,primaryNumber,currentTeam,id,name,primaryPosition,code,abbreviation,useName,boxscoreName,nickName,gender,isPlayer,isVerified,pronunciation,mlbDebutDate,nameFirstLast,nameSlug,firstLastName,lastFirstName,lastInitName,initLastName,fullFMLName,fullLFMName,strikeZoneTop,strikeZoneBottom,pitchHand,code,description,nameTitle,nameMatrilineal,nameShort,birthDate,birthCity,birthStateProvince,birthCountry,height,weight,active,currentAge,primarySport,id,link,batSide,code,description' }
          });
          const details = response.data.people?.[0];
          if (!details) {
              console.warn(`[MLBStatsService] No details found for pitcher ${pitcherId}`); return null;
          }
          return details;
      } catch (error) {
          console.error(`[MLBStatsService] Error fetching pitcher details for ID ${pitcherId}:`, error); return null;
      }
  }
  public static async getScheduleWithPitchers(season: number = CURRENT_MLB_SEASON): Promise<MLBGame[]> { // Default to current season
    console.log(`[MLBStatsService] Fetching schedule for season ${season} with probable pitchers...`);
    try {
      const response = await axios.get<{ dates: { games: MLBGame[] }[] }>(`${BASE_URL}/schedule`, {
        params: { sportId: 1, season: season, gameType: 'R', hydrate: 'probablePitcher', fields: 'dates,games,gamePk,gameDate,status,teams,probablePitcher,score,isWinner' }
      });
      const allGames = response.data.dates.flatMap(date => date.games);
      console.log(`[MLBStatsService] Fetched ${allGames.length} total games from schedule.`);
      return allGames;
    } catch (error: any) {
      console.error(`[MLBStatsService] Error fetching MLB schedule with pitchers:`, error.message);
      return []; 
    }
  }

  private static async fetchTeamRecord(teamId: number, season: string): Promise<MLBTeamRecord | null> {
    try {
      const url = `${BASE_URL}/teams/${teamId}/stats/record`;
      const params = {
        season,
        gameType: 'R',
      };

      const response = await axios.get<MLBTeamRecord>(url, {
        params,
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const records = response.data.records;
      if (!records || records.length === 0) {
        console.warn(`[MLBStatsService] No record found for team ID ${teamId}`);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error(`[MLBStatsService] Error fetching record for team ${teamId}:`, error);
      return null;
    }
  }
}