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
const CURRENT_MLB_SEASON = 2023; // Use 2023 season data since 2024 hasn't started

interface TeamStats {
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  runsScored: number;
  runsAllowed: number;
  lastTenGames: string;
  streak: number;
  winPercentage: number;
  lastTenWins: number;
  battingAvgVsLHP: number;
  battingAvgVsRHP: number;
  opsVsLHP: number;
  opsVsRHP: number;
  teamERA: number;
  teamWHIP: number;
}

interface MLBStatsResponse {
  stats: Array<{
    group?: string;
    splits: Array<{
      stat: {
        runs?: number;
        runsScoredAgainst?: number;
        avg?: number;
        ops?: number;
        era?: number;
        whip?: number;
        vsLHP?: boolean;
        vsRHP?: boolean;
      };
    }>;
  }>;
}

interface TeamRecord {
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
}

export class MLBStatsService {
  private static teamIdMap: Map<string, number> | null = null;
  private static teamFetchPromise: Promise<void> | null = null;
  private static pitcherStatsCache: Record<string, { data: PitcherStats | null, timestamp: number }> = {};
  private static PITCHER_CACHE_DURATION = 6 * 60 * 60 * 1000; // Cache pitcher stats for 6 hours
  private static pitcherDetailsCache: Record<string, { data: PitcherDetails | null, timestamp: number }> = {};
  private static PITCHER_DETAILS_CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache details for 24 hours

  private static async initializeTeamIdMap(): Promise<void> {
    if (this.teamIdMap) return;
    if (this.teamFetchPromise) return this.teamFetchPromise;

    console.log("[MLBStatsService] Initializing team ID map...");
    this.teamFetchPromise = axios.get<{ teams: MLBTeam[] }>(`${BASE_URL}/teams`, {
      params: { sportId: 1, season: CURRENT_MLB_SEASON }
    })
      .then(response => {
        const map = new Map<string, number>();
        response.data.teams.forEach(team => {
          const lowerCaseName = team.name.toLowerCase();
          map.set(lowerCaseName, team.id);
          if (lowerCaseName === "oakland athletics") map.set("oakland athletics", team.id);
          if (lowerCaseName === "arizona diamondbacks") map.set("d-backs", team.id);
        });
        this.teamIdMap = map;
        console.log(`[MLBStatsService] Team ID Map Initialized with ${this.teamIdMap.size} entries.`);
      })
      .catch(err => {
        console.error("[MLBStatsService] Failed to fetch MLB team IDs:", err);
        this.teamIdMap = new Map();
      })
      .finally(() => {
        this.teamFetchPromise = null;
      });
    return this.teamFetchPromise;
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
      const statsResponse = await axios.get<MLBTeamStatsResponse>(`${BASE_URL}/teams/${teamId}/stats`, {
        params: {
          stats: 'season,homeAway,lastXGames,vsLeft,vsRight',
          season: CURRENT_MLB_SEASON,
          group: 'hitting,pitching'
        }
      });
      
      console.log(`[MLBStatsService] Raw stats response for ${teamName} (ID: ${teamId}):`, JSON.stringify(statsResponse.data, null, 2));

      const hittingStatsEntry = statsResponse.data.stats?.find(s => s.group?.displayName === 'hitting');
      const pitchingStatsEntry = statsResponse.data.stats?.find(s => s.group?.displayName === 'pitching');

      const overallHittingSplit = hittingStatsEntry?.splits?.[0]?.stat || {}; 
      const overallPitchingSplit = pitchingStatsEntry?.splits?.[0]?.stat || {};

      const homeHittingSplit = hittingStatsEntry?.splits?.find(s => s.split?.isHome)?.stat || {}; 
      const awayHittingSplit = hittingStatsEntry?.splits?.find(s => s.split?.isAway)?.stat || {};
      const lastTenHittingSplit = hittingStatsEntry?.splits?.find(s => s.split?.statType === 'lastXGames' && s.split?.numGames === 10)?.stat || {};
      const vsLeftSplit = hittingStatsEntry?.splits?.find(s => s.split?.type === 'vsLeft')?.stat || {};
      const vsRightSplit = hittingStatsEntry?.splits?.find(s => s.split?.type === 'vsRight')?.stat || {};

      if (Object.keys(overallHittingSplit).length === 0 && Object.keys(overallPitchingSplit).length === 0) {
          console.warn(`[MLBStatsService] Could not parse overall hitting/pitching stats from API response for ${teamName}`);
          return null; 
      }
      
      const wins = overallHittingSplit?.wins ?? overallPitchingSplit?.wins ?? 0;
      const losses = overallHittingSplit?.losses ?? overallPitchingSplit?.losses ?? 0;
      const gamesPlayed = overallHittingSplit?.gamesPlayed ?? overallPitchingSplit?.gamesPlayed ?? (wins + losses);

      const stats: TeamStats = {
        wins: wins,
        losses: losses,
        homeWins: homeHittingSplit?.wins ?? 0,
        homeLosses: homeHittingSplit?.losses ?? 0,
        awayWins: awayHittingSplit?.wins ?? 0,
        awayLosses: awayHittingSplit?.losses ?? 0,
        lastTenWins: lastTenHittingSplit?.wins ?? 0,
        avgRunsScored: (overallHittingSplit?.runsScored ?? 0) / (gamesPlayed || 1),
        avgRunsAllowed: (overallPitchingSplit?.runsAllowed ?? 0) / (gamesPlayed || 1),
        teamERA: this.parseFloatStat(overallPitchingSplit?.era),
        teamWHIP: this.parseFloatStat(overallPitchingSplit?.whip),
        avgVsLHP: this.parseFloatStat(vsLeftSplit?.avg),
        opsVsLHP: this.parseFloatStat(vsLeftSplit?.ops),
        avgVsRHP: this.parseFloatStat(vsRightSplit?.avg),
        opsVsRHP: this.parseFloatStat(vsRightSplit?.ops),
      };

      console.log(`[MLBStatsService] Successfully processed stats for ${teamName}.`);
      return stats;

    } catch (error: any) {
      console.error(`[MLBStatsService] Error in getTeamStats API call for ${teamName}:`, error.message);
      if (axios.isAxiosError(error)) {
         console.error(`[MLBStatsService] URL: ${error.config?.url}`);
         console.error(`[MLBStatsService] Params: ${JSON.stringify(error.config?.params)}`);
         console.error(`[MLBStatsService] Response Status: ${error.response?.status}`);
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
      const response = await axios.get<{ dates: { games: MLBGame[] }[] }>(`${BASE_URL}/schedule`, {
        params: { teamId: homeTeamId, opponentId: awayTeamId, season: CURRENT_MLB_SEASON, sportId: 1, gameType: 'R', fields: 'dates,games,status,teams,score' }
      });
      const h2hGames = response.data.dates.flatMap(date => date.games).filter(game => game.status.abstractGameState === 'Final');
       if (h2hGames.length === 0) {
          console.warn(`[MLBStatsService] No completed H2H games found between ${homeTeamName} and ${awayTeamName} in season ${CURRENT_MLB_SEASON}`);
          return { totalGames: 0, homeTeamWins: 0, awayTeamWins: 0, averageRunsDiff: 0 };
      }
      const stats: H2HStats = { totalGames: h2hGames.length, homeTeamWins: 0, awayTeamWins: 0, averageRunsDiff: 0 };
      let totalRunsDiff = 0;
      h2hGames.forEach(game => {
        const gameHomeTeamId = game.teams.home.team.id;
        const gameHomeScore = game.teams.home.score;
        const gameAwayScore = game.teams.away.score;
        let currentHomeTeamScore, currentAwayTeamScore;
        if (gameHomeTeamId === homeTeamId) { currentHomeTeamScore = gameHomeScore; currentAwayTeamScore = gameAwayScore; }
        else { currentHomeTeamScore = gameAwayScore; currentAwayTeamScore = gameHomeScore; }
        if (currentHomeTeamScore > currentAwayTeamScore) stats.homeTeamWins++; else stats.awayTeamWins++;
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

  private static async fetchTeamRecord(teamId: number, season: string): Promise<TeamRecord | null> {
    try {
      const url = `${BASE_URL}/teams/${teamId}/stats/record`;
      const params = {
        season,
        gameType: 'R',
      };

      const response = await axios.get(url, {
        params,
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      const record = response.data.records[0];
      if (!record) {
        console.warn(`[MLBStatsService] No record found for team ID ${teamId}`);
        return null;
      }

      return {
        wins: record.wins || 0,
        losses: record.losses || 0,
        homeWins: record.homeWins || 0,
        homeLosses: record.homeLosses || 0,
        awayWins: record.awayWins || 0,
        awayLosses: record.awayLosses || 0,
        lastTenGames: record.lastTenGames || "0-0",
        streak: record.streak || 0,
        winPercentage: record.winPercentage || 0,
        lastTenWins: record.lastTenWins || 0,
      };
    } catch (error) {
      console.error(`[MLBStatsService] Error fetching record for team ${teamId}:`, error);
      return null;
    }
  }
}