import axios from 'axios';
import type { TeamStats, H2HStats } from './predictionService.js';
import { CacheService } from './cacheService.ts';

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
  abbreviation?: string;
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

interface MLBPitcherStatsResponse {
  stats: Array<{ type: { displayName: string }, group: { displayName: string }, splits: Array<{ stat: PitcherStats }> }>;
}

const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const CURRENT_MLB_SEASON = new Date().getFullYear(); // Dynamically use the current year for the current season

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

interface HeadToHeadStats {
  team1Wins: number;
  team2Wins: number;
  team1RunsScored: number;
  team2RunsScored: number;
  totalGames: number;
  team1WinPercentage: number;
  team2WinPercentage: number;
  team1AvgRuns: number;
  team2AvgRuns: number;
}

// Add new interfaces for player statistics
export interface MLBPlayerStats {
  batting: {
    avg: string;
    obp: string;
    slg: string;
    ops: string;
    wOBA: string;
    wRCPlus: number;
    bWAR: number;
    homeRuns: number;
    rbi: number;
    stolenBases: number;
    strikeOutRate: string;
    walkRate: string;
    babip: string;
    iso: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    launchAngle: string;
  };
  pitching: {
    era: string;
    whip: string;
    fip: string;
    xFIP: string;
    kPer9: string;
    bbPer9: string;
    hrPer9: string;
    babip: string;
    groundBallRate: string;
    flyBallRate: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    spinRate: string;
    pitchVelocity: string;
  };
  fielding: {
    defensiveRunsSaved: number;
    ultimateZoneRating: number;
    outsAboveAverage: number;
    fieldingPercentage: string;
    errors: number;
    assists: number;
    putouts: number;
  };
  splits: {
    vsLeft: {
      avg: string;
      ops: string;
      homeRuns: number;
      strikeOutRate: string;
      walkRate: string;
      hardHitRate: string;
      barrelRate: string;
      exitVelocity: string;
      launchAngle: string;
      babip: string;
    };
    vsRight: {
      avg: string;
      ops: string;
      homeRuns: number;
      strikeOutRate: string;
      walkRate: string;
      hardHitRate: string;
      barrelRate: string;
      exitVelocity: string;
      launchAngle: string;
      babip: string;
    };
    home: {
      avg: string;
      ops: string;
      homeRuns: number;
      hardHitRate: string;
      barrelRate: string;
      exitVelocity: string;
      launchAngle: string;
      strikeOutRate: string;
      walkRate: string;
      babip: string;
    };
    away: {
      avg: string;
      ops: string;
      homeRuns: number;
      hardHitRate: string;
      barrelRate: string;
      exitVelocity: string;
      launchAngle: string;
      strikeOutRate: string;
      walkRate: string;
      babip: string;
    };
  };
  historical: {
    last30Days: {
      avg: string;
      ops: string;
      homeRuns: number;
      era: string;
      whip: string;
      hardHitRate: string;
      barrelRate: string;
      exitVelocity: string;
      launchAngle: string;
      strikeOutRate: string;
      walkRate: string;
      babip: string;
    };
    last7Days: {
      avg: string;
      ops: string;
      homeRuns: number;
      era: string;
      whip: string;
      hardHitRate: string;
      barrelRate: string;
      exitVelocity: string;
      launchAngle: string;
      strikeOutRate: string;
      walkRate: string;
      babip: string;
    };
  };
}

interface LastGameInfo {
  date: string;
  location: string;
  nextGameLocation: string;
}

interface SituationalStats {
  vsLeft: {
    avg: string;
    ops: string;
    homeRuns: number;
    strikeOutRate: string;
    walkRate: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    launchAngle: string;
    babip: string;
    wOBA: string;
    wRCPlus: number;
  };
  vsRight: {
    avg: string;
    ops: string;
    homeRuns: number;
    strikeOutRate: string;
    walkRate: string;
    hardHitRate: string;
    barrelRate: string;
    launchAngle: string;
    babip: string;
    wOBA: string;
    wRCPlus: number;
  };
  home: {
    avg: string;
    ops: string;
    homeRuns: number;
    strikeOutRate: string;
    walkRate: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    launchAngle: string;
    babip: string;
    wOBA: string;
    wRCPlus: number;
  };
  away: {
    avg: string;
    ops: string;
    homeRuns: number;
    strikeOutRate: string;
    walkRate: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    launchAngle: string;
    babip: string;
    wOBA: string;
    wRCPlus: number;
  };
  last30Days: {
    avg: string;
    ops: string;
    homeRuns: number;
    strikeOutRate: string;
    walkRate: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    launchAngle: string;
    babip: string;
    wOBA: string;
    wRCPlus: number;
  };
  highLeverage: {
    avg: string;
    ops: string;
    homeRuns: number;
    strikeOutRate: string;
    walkRate: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    launchAngle: string;
    babip: string;
    wOBA: string;
    wRCPlus: number;
  };
  runnersInScoringPosition: {
    avg: string;
    ops: string;
    homeRuns: number;
    strikeOutRate: string;
    walkRate: string;
    hardHitRate: string;
    barrelRate: string;
    exitVelocity: string;
    launchAngle: string;
    babip: string;
    wOBA: string;
    wRCPlus: number;
  };
}

interface BullpenStats {
  era: string;
  whip: string;
  inningsPitched: string;
  strikeOuts: number;
  walks: number;
  homeRuns: number;
  last7Days: {
    era: string;
    whip: string;
    inningsPitched: string;
    strikeOuts: number;
    walks: number;
    homeRuns: number;
    usage: {
      highLeverage: number;
      mediumLeverage: number;
      lowLeverage: number;
    };
    restDays: {
      zero: number;
      one: number;
      two: number;
      threePlus: number;
    };
  };
  last30Days: {
    era: string;
    whip: string;
    inningsPitched: string;
    strikeOuts: number;
    walks: number;
    homeRuns: number;
  };
  splits: {
    vsLeft: {
      era: string;
      whip: string;
      strikeOutRate: string;
      walkRate: string;
    };
    vsRight: {
      era: string;
      whip: string;
      strikeOutRate: string;
      walkRate: string;
    };
  };
  highLeverage: {
    era: string;
    whip: string;
    inningsPitched: string;
    strikeOuts: number;
    walks: number;
    homeRuns: number;
  };
}

interface BoxscoreTeam {
  pitchers: number[];
}
interface BoxscoreResponse {
  teams: {
    home: BoxscoreTeam;
    away: BoxscoreTeam;
  };
}

export class MLBStatsService {
  private static teamIdMap: Map<string, number> | null = null;
  private static teamFetchPromise: Promise<void> | null = null;
  private static pitcherStatsCache: Record<string, { data: PitcherStats | null, timestamp: number }> = {};
  private static PITCHER_CACHE_DURATION = 6 * 60 * 60 * 1000; // Cache pitcher stats for 6 hours
  private static pitcherDetailsCache: Record<string, { data: PitcherDetails | null, timestamp: number }> = {};
  private static PITCHER_DETAILS_CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache details for 24 hours
  private static playerStatsCache: Record<string, { data: MLBPlayerStats | null, timestamp: number }> = {};
  private static PLAYER_STATS_CACHE_DURATION = 6 * 60 * 60 * 1000; // Cache player stats for 6 hours
  private static readonly CACHE_TTL = 3600; // 1 hour in seconds

  // Add static map of MLB team abbreviations to IDs
  private static TEAM_ABBREVIATIONS: Record<string, number> = {
    'ari': 109, // Arizona Diamondbacks
    'atl': 144, // Atlanta Braves
    'bal': 110, // Baltimore Orioles
    'bos': 111, // Boston Red Sox
    'chc': 112, // Chicago Cubs
    'cin': 113, // Cincinnati Reds
    'cle': 114, // Cleveland Guardians
    'col': 115, // Colorado Rockies
    'cws': 145, // Chicago White Sox
    'det': 116, // Detroit Tigers
    'hou': 117, // Houston Astros
    'kc': 118, 'kcr': 118, // Kansas City Royals
    'laa': 108, // Los Angeles Angels
    'lad': 119, // Los Angeles Dodgers
    'mia': 146, 'fla': 146, // Miami Marlins (formerly FLA)
    'mil': 158, // Milwaukee Brewers
    'min': 142, // Minnesota Twins
    'nym': 121, // New York Mets
    'nyy': 147, // New York Yankees
    'oak': 133, // Oakland Athletics
    'phi': 143, // Philadelphia Phillies
    'pit': 134, // Pittsburgh Pirates
    'sd': 135, 'sdp': 135, // San Diego Padres
    'sea': 136, // Seattle Mariners
    'sf': 137, 'sfg': 137, // San Francisco Giants
    'stl': 138, // St. Louis Cardinals
    'tb': 139, 'tbr': 139, 'tam': 139, // Tampa Bay Rays
    'tex': 140, // Texas Rangers
    'tor': 141, // Toronto Blue Jays
    'was': 120, 'wsn': 120, 'wsh': 120 // Washington Nationals
  };

  private static async initializeTeamIdMap(): Promise<void> {
    try {
        const response = await axios.get(`${BASE_URL}/teams`, {
            params: { sportId: 1, season: CURRENT_MLB_SEASON }
        });
        
        const data = response.data as { teams: MLBTeam[] };
        this.teamIdMap = new Map();

        // Special cases mapping
        const specialCases: Record<string, string> = {
          'st.louis': 'st. louis',
          'stlouis': 'st. louis',
          'st.louisCardinals': 'st. louis cardinals',
          'St.LouisCardinals': 'st. louis cardinals'
        };
        
        data.teams.forEach(team => {
            // Standard mappings
            this.teamIdMap?.set(team.name.toLowerCase(), team.id);
            this.teamIdMap?.set(team.teamName.toLowerCase(), team.id);
            this.teamIdMap?.set(team.locationName.toLowerCase(), team.id);
            
            // Add mapping for abbreviation (from MLB API)
            if (team.abbreviation) {
              this.teamIdMap?.set(team.abbreviation.toLowerCase(), team.id);
            }

            // Add mapping for our static abbreviation map
            for (const [abbr, id] of Object.entries(MLBStatsService.TEAM_ABBREVIATIONS)) {
              if (id === team.id) {
                this.teamIdMap?.set(abbr, team.id);
              }
            }
            
            // Handle special cases
            if (team.name.toLowerCase().includes('st. louis')) {
                Object.keys(specialCases).forEach(variant => {
                    this.teamIdMap?.set(variant, team.id);
                });
            }
            
            // Add mapping for Rundown API team IDs
            this.teamIdMap?.set(team.id.toString(), team.id);
            
            // Add mapping for team name without location
            const shortName = team.teamName.toLowerCase().replace(team.locationName.toLowerCase(), '').trim();
            this.teamIdMap?.set(shortName, team.id);
            
            // Add mapping for combined name without spaces
            const combinedName = `${team.locationName}${team.teamName}`.toLowerCase().replace(/\s+/g, '');
            this.teamIdMap?.set(combinedName, team.id);
        });
        
        console.log(`[MLBStatsService] Initialized team ID map with ${this.teamIdMap.size} entries.`);
    } catch (error) {
        console.error('[MLBStatsService] Error initializing team ID map:', error);
        this.teamIdMap = null;
    }
  }

  private static async getTeamId(teamName: string): Promise<number | null> {
    if (!this.teamIdMap && !this.teamFetchPromise) {
      this.teamFetchPromise = this.initializeTeamIdMap();
    }
    if (!this.teamIdMap) {
      await this.teamFetchPromise;
    }
    // Handle special cases and normalize team name
    const normalizedName = teamName
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/-/g, '')
      .trim();

    // Try to find the team ID
    let id = this.teamIdMap?.get(normalizedName);
    if (!id) {
      // Try without spaces
      const noSpaceName = normalizedName.replace(/\s+/g, '');
      id = this.teamIdMap?.get(noSpaceName);
    }
    if (!id) {
      // Try with hyphens removed
      const hyphenless = normalizedName.replace(/-/g, '');
      id = this.teamIdMap?.get(hyphenless);
    }
    if (!id) {
      // Try static abbreviation map
      id = MLBStatsService.TEAM_ABBREVIATIONS[normalizedName];
    }
    if (!id) {
      console.warn(`[MLBStatsService] Team ID not found for: "${teamName}" (Normalized: "${normalizedName}")`);
      return null;
    }
    return id;
  }

  private static parseFloatStat(stat: string | undefined): number | undefined {
    if (stat === undefined) return undefined;
    const num = parseFloat(stat);
    return isNaN(num) ? undefined : num;
  }

  public static async getTeamStats(teamIdOrName: string, options?: { startDate?: string; endDate?: string }): Promise<TeamStats | null> {
    try {
      const teamId = await this.getTeamId(teamIdOrName);
      if (!teamId) {
        console.error(`[MLBStatsService] Cannot fetch stats for ${teamIdOrName} due to missing ID.`);
        return null;
      }

      // Use the /standings endpoint for robust stats fetching
      const response = await axios.get('https://statsapi.mlb.com/api/v1/standings', {
        params: {
          leagueId: '103,104', // AL and NL
          season: CURRENT_MLB_SEASON,
          teamId: teamId,
          standingsTypes: 'regularSeason'
        }
      });

      // Find the team record in the response
      const standingsData = response.data as { records: Array<{ teamRecords: any[] }> };
      const teamRecord = standingsData.records.flatMap((r: any) => r.teamRecords)
        .find((tr: any) => tr.team.id === teamId);

      if (!teamRecord) {
        console.warn(`[MLBStatsService] No stats found for team ID ${teamId}`);
        return null;
      }

      const splitRecords = teamRecord.splitRecords || [];
      const homeRecord = splitRecords.find((r: any) => r.type === 'home') || { wins: 0, losses: 0 };
      const awayRecord = splitRecords.find((r: any) => r.type === 'away') || { wins: 0, losses: 0 };
      const lastTenRecord = splitRecords.find((r: any) => r.type === 'lastTen') || { wins: 0, losses: 0 };

      return {
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
        avgRunsScored: teamRecord.runsScored ? teamRecord.runsScored / (teamRecord.gamesPlayed || 1) : 0,
        avgRunsAllowed: teamRecord.runsAllowed ? teamRecord.runsAllowed / (teamRecord.gamesPlayed || 1) : 0,
        homeWinPercentage: homeRecord.wins / (homeRecord.wins + homeRecord.losses || 1),
        awayWinPercentage: awayRecord.wins / (awayRecord.wins + awayRecord.losses || 1)
      };
    } catch (error) {
      console.error(`Error fetching team stats for ${teamIdOrName}:`, error);
      return null;
    }
  }

  public static async getH2HStats(homeTeamName: string, awayTeamName: string): Promise<H2HStats | null> {
    const [homeTeamId, awayTeamId] = await Promise.all([
        this.getTeamId(homeTeamName),
        this.getTeamId(awayTeamName)
    ]);
    if (!homeTeamId || !awayTeamId) return null;
    console.log(`[MLBStatsService] Fetching H2H stats for ${homeTeamName} vs ${awayTeamName} for seasons 2022-2024`);
    try {
      // Fetch games from 2022-2024 seasons
      const [games2024, games2023, games2022] = await Promise.all([
        this.fetchH2HGames(homeTeamId, awayTeamId, CURRENT_MLB_SEASON),
        this.fetchH2HGames(homeTeamId, awayTeamId, CURRENT_MLB_SEASON - 1),
        this.fetchH2HGames(homeTeamId, awayTeamId, CURRENT_MLB_SEASON - 2)
      ]);

      // Combine games from all seasons
      const h2hGames = [...(games2024 || []), ...(games2023 || []), ...(games2022 || [])];

      if (h2hGames.length === 0) {
          console.warn(`[MLBStatsService] No completed H2H games found between ${homeTeamName} and ${awayTeamName} in seasons 2022-2024`);
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

  private static async fetchH2HGames(homeTeamId: number, awayTeamId: number, season: number): Promise<MLBGame[] | null> {
    try {
      // First try with home team as teamId and away team as opponentId
      const homeResponse = await axios.get(`${BASE_URL}/schedule`, {
        params: { 
          teamId: homeTeamId, 
          opponentId: awayTeamId, 
          season: season, 
          sportId: 1, 
          gameType: ['R', 'P', 'F'], // Include regular season, playoffs, and finals
          fields: 'dates,games,status,teams,score,gameDate' 
        }
      });

      // Then try with away team as teamId and home team as opponentId
      const awayResponse = await axios.get(`${BASE_URL}/schedule`, {
        params: { 
          teamId: awayTeamId, 
          opponentId: homeTeamId, 
          season: season, 
          sportId: 1, 
          gameType: ['R', 'P', 'F'], // Include regular season, playoffs, and finals
          fields: 'dates,games,status,teams,score,gameDate' 
        }
      });

      const homeData = homeResponse.data as MLBScheduleResponse;
      const awayData = awayResponse.data as MLBScheduleResponse;

      // Combine and filter completed games from both responses
      const allGames = [
        ...homeData.dates.flatMap(date => date.games),
        ...awayData.dates.flatMap(date => date.games)
      ].filter(game => game.status.abstractGameState === 'Final');

      // Log the number of games found
      if (allGames.length > 0) {
        console.log(`[MLBStatsService] Found ${allGames.length} completed H2H games for season ${season}`);
      }

      return allGames;
    } catch (error) {
      console.error(`[MLBStatsService] Error fetching H2H games for season ${season}:`, error);
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

  public static async getHeadToHeadStats(team1Id: number, team2Id: number): Promise<HeadToHeadStats | null> {
    try {
      // Get games from previous season and current season
      const previousSeason = CURRENT_MLB_SEASON - 1;
      const response = await axios.get(`${BASE_URL}/schedule`, {
        params: {
          sportId: 1,
          teamId: team1Id,
          opponentId: team2Id,
          season: previousSeason,
          gameType: 'R'  // Regular season games only
        }
      });

      const data = response.data as { dates: { games: MLBGame[] }[] };
      const games = data.dates.flatMap(date => date.games);

      if (!games || games.length === 0) {
        console.log(`[MLBStatsService] No head-to-head games found between teams ${team1Id} and ${team2Id} in ${previousSeason}`);
        return null;
      }

      // Calculate head-to-head stats
      let team1Wins = 0;
      let team2Wins = 0;
      let team1RunsScored = 0;
      let team2RunsScored = 0;
      let totalGames = games.length;

      games.forEach(game => {
        const team1IsHome = game.teams.home.team.id === team1Id;
        const team1Score = team1IsHome ? game.teams.home.score : game.teams.away.score;
        const team2Score = team1IsHome ? game.teams.away.score : game.teams.home.score;

        if (team1Score > team2Score) team1Wins++;
        else if (team2Score > team1Score) team2Wins++;

        team1RunsScored += team1Score;
        team2RunsScored += team2Score;
      });

      return {
        team1Wins,
        team2Wins,
        team1RunsScored,
        team2RunsScored,
        totalGames,
        team1WinPercentage: team1Wins / totalGames,
        team2WinPercentage: team2Wins / totalGames,
        team1AvgRuns: team1RunsScored / totalGames,
        team2AvgRuns: team2RunsScored / totalGames
      };

    } catch (error) {
      console.error(`[MLBStatsService] Error getting head-to-head stats for teams ${team1Id} and ${team2Id}:`, error);
      return null;
    }
  }

  public static async getPlayerStats(playerId: string | number): Promise<MLBPlayerStats | null> {
    try {
      const numericId = typeof playerId === 'string' ? parseInt(playerId, 10) : playerId;
      if (isNaN(numericId)) {
        console.error(`[MLBStatsService] Invalid player ID: ${playerId}`);
        return null;
      }

      // Check cache first
      const cacheKey = `player_stats_${numericId}`;
      const cachedData = MLBStatsService.playerStatsCache[cacheKey];
      if (cachedData && Date.now() - cachedData.timestamp < MLBStatsService.PLAYER_STATS_CACHE_DURATION) {
        return cachedData.data;
      }

      const response = await axios.get(`${BASE_URL}/people/${numericId}/stats`, {
        params: {
          stats: 'season',
          group: 'hitting,pitching,fielding',
          season: CURRENT_MLB_SEASON
        }
      });

      const data = response.data as { stats?: Array<{
        type: { displayName: string };
        group: { displayName: string };
        splits: Array<{ stat: Record<string, any> }>;
      }> };

      if (!data || !Array.isArray(data.stats)) {
        console.error(`[MLBStatsService] Invalid response format for player ${numericId}`);
        return null;
      }

      const processedStats = MLBStatsService.processPlayerStats(data.stats);
      
      // Cache the results
      MLBStatsService.playerStatsCache[cacheKey] = {
        data: processedStats,
        timestamp: Date.now()
      };

      return processedStats;
    } catch (error) {
      console.error(`[MLBStatsService] Error fetching player stats for ID ${playerId}:`, error);
      return null;
    }
  }

  public static clearPlayerStatsCache(): void {
    this.playerStatsCache = {};
    console.log('[MLBStatsService] Player stats cache cleared');
  }

  public static getPlayerStatsCacheSize(): number {
    return Object.keys(this.playerStatsCache).length;
  }

  public static getPlayerStatsCacheAge(playerId: number): number | null {
    const cacheKey = playerId.toString();
    const cachedData = this.playerStatsCache[cacheKey];
    if (!cachedData) {
      return null;
    }
    return Date.now() - cachedData.timestamp;
  }

  private static processPlayerStats(stats: Array<{
    type: { displayName: string };
    group: { displayName: string };
    splits: Array<{
      stat: Record<string, any>;
    }>;
  }>): MLBPlayerStats {
    const result: MLBPlayerStats = {
      batting: {
        avg: '0',
        obp: '0',
        slg: '0',
        ops: '0',
        wOBA: '0',
        wRCPlus: 0,
        bWAR: 0,
        homeRuns: 0,
        rbi: 0,
        stolenBases: 0,
        strikeOutRate: '0',
        walkRate: '0',
        babip: '0',
        iso: '0',
        hardHitRate: '0',
        barrelRate: '0',
        exitVelocity: '0',
        launchAngle: '0'
      },
      pitching: {
        era: '0',
        whip: '0',
        fip: '0',
        xFIP: '0',
        kPer9: '0',
        bbPer9: '0',
        hrPer9: '0',
        babip: '0',
        groundBallRate: '0',
        flyBallRate: '0',
        hardHitRate: '0',
        barrelRate: '0',
        exitVelocity: '0',
        spinRate: '0',
        pitchVelocity: '0'
      },
      fielding: {
        defensiveRunsSaved: 0,
        ultimateZoneRating: 0,
        outsAboveAverage: 0,
        fieldingPercentage: '0',
        errors: 0,
        assists: 0,
        putouts: 0
      },
      splits: {
        vsLeft: {
          avg: '0',
          ops: '0',
          homeRuns: 0,
          strikeOutRate: '0',
          walkRate: '0',
          hardHitRate: '0',
          barrelRate: '0',
          exitVelocity: '0',
          launchAngle: '0',
          babip: '0'
        },
        vsRight: {
          avg: '0',
          ops: '0',
          homeRuns: 0,
          strikeOutRate: '0',
          walkRate: '0',
          hardHitRate: '0',
          barrelRate: '0',
          exitVelocity: '0',
          launchAngle: '0',
          babip: '0'
        },
        home: {
          avg: '0',
          ops: '0',
          homeRuns: 0,
          hardHitRate: '0',
          barrelRate: '0',
          exitVelocity: '0',
          launchAngle: '0',
          strikeOutRate: '0',
          walkRate: '0',
          babip: '0'
        },
        away: {
          avg: '0',
          ops: '0',
          homeRuns: 0,
          hardHitRate: '0',
          barrelRate: '0',
          exitVelocity: '0',
          launchAngle: '0',
          strikeOutRate: '0',
          walkRate: '0',
          babip: '0'
        }
      },
      historical: {
        last30Days: {
          avg: '0',
          ops: '0',
          homeRuns: 0,
          era: '0',
          whip: '0',
          hardHitRate: '0',
          barrelRate: '0',
          exitVelocity: '0',
          launchAngle: '0',
          strikeOutRate: '0',
          walkRate: '0',
          babip: '0'
        },
        last7Days: {
          avg: '0',
          ops: '0',
          homeRuns: 0,
          era: '0',
          whip: '0',
          hardHitRate: '0',
          barrelRate: '0',
          exitVelocity: '0',
          launchAngle: '0',
          strikeOutRate: '0',
          walkRate: '0',
          babip: '0'
        }
      }
    };

    for (const statGroup of stats) {
      const { type, group, splits } = statGroup;
      const statType = type.displayName;
      const groupType = group.displayName;

      for (const split of splits) {
        const stat = split.stat;
        
        if (groupType === 'hitting') {
          if (statType === 'season') {
            result.batting = {
              ...result.batting,
              avg: this.formatStat(stat.avg, '0'),
              obp: this.formatStat(stat.obp, '0'),
              slg: this.formatStat(stat.slg, '0'),
              ops: this.formatStat(stat.ops, '0'),
              wOBA: this.formatStat(stat.wOBA, '0'),
              wRCPlus: this.parseNumber(stat.wRCPlus, 0),
              bWAR: this.parseNumber(stat.war, 0),
              homeRuns: this.parseNumber(stat.homeRuns, 0),
              rbi: this.parseNumber(stat.rbi, 0),
              stolenBases: this.parseNumber(stat.stolenBases, 0),
              strikeOutRate: this.formatStat(stat.strikeOutRate, '0'),
              walkRate: this.formatStat(stat.walkRate, '0'),
              babip: this.formatStat(stat.babip, '0'),
              iso: this.formatStat(stat.iso, '0'),
              hardHitRate: this.formatStat(stat.hardHitRate, '0'),
              barrelRate: this.formatStat(stat.barrelRate, '0'),
              exitVelocity: this.formatStat(stat.exitVelocity, '0'),
              launchAngle: this.formatStat(stat.launchAngle, '0')
            };
          } else if (statType === 'vsRHP' || statType === 'vsLHP') {
            const targetSplit = statType === 'vsRHP' ? result.splits.vsRight : result.splits.vsLeft;
            Object.assign(targetSplit, {
              avg: this.formatStat(stat.avg, '0'),
              ops: this.formatStat(stat.ops, '0'),
              homeRuns: this.parseNumber(stat.homeRuns, 0),
              strikeOutRate: this.formatStat(stat.strikeOutRate, '0'),
              walkRate: this.formatStat(stat.walkRate, '0'),
              hardHitRate: this.formatStat(stat.hardHitRate, '0'),
              barrelRate: this.formatStat(stat.barrelRate, '0'),
              exitVelocity: this.formatStat(stat.exitVelocity, '0'),
              launchAngle: this.formatStat(stat.launchAngle, '0'),
              babip: this.formatStat(stat.babip, '0')
            });
          } else if (statType === 'home' || statType === 'away') {
            const targetSplit = statType === 'home' ? result.splits.home : result.splits.away;
            Object.assign(targetSplit, {
              avg: this.formatStat(stat.avg, '0'),
              ops: this.formatStat(stat.ops, '0'),
              homeRuns: this.parseNumber(stat.homeRuns, 0),
              hardHitRate: this.formatStat(stat.hardHitRate, '0'),
              barrelRate: this.formatStat(stat.barrelRate, '0'),
              exitVelocity: this.formatStat(stat.exitVelocity, '0'),
              launchAngle: this.formatStat(stat.launchAngle, '0'),
              strikeOutRate: this.formatStat(stat.strikeOutRate, '0'),
              walkRate: this.formatStat(stat.walkRate, '0'),
              babip: this.formatStat(stat.babip, '0')
            });
          }
        } else if (groupType === 'pitching') {
          if (statType === 'season') {
            result.pitching = {
              ...result.pitching,
              era: this.formatStat(stat.era, '0'),
              whip: this.formatStat(stat.whip, '0'),
              fip: this.formatStat(stat.fip, '0'),
              xFIP: this.formatStat(stat.xFIP, '0'),
              kPer9: this.formatStat(stat.kPer9, '0'),
              bbPer9: this.formatStat(stat.bbPer9, '0'),
              hrPer9: this.formatStat(stat.hrPer9, '0'),
              babip: this.formatStat(stat.babip, '0'),
              groundBallRate: this.formatStat(stat.groundBallRate, '0'),
              flyBallRate: this.formatStat(stat.flyBallRate, '0'),
              hardHitRate: this.formatStat(stat.hardHitRate, '0'),
              barrelRate: this.formatStat(stat.barrelRate, '0'),
              exitVelocity: this.formatStat(stat.exitVelocity, '0'),
              spinRate: this.formatStat(stat.spinRate, '0'),
              pitchVelocity: this.formatStat(stat.pitchVelocity, '0')
            };
          }
        } else if (groupType === 'fielding') {
          result.fielding = {
            ...result.fielding,
            defensiveRunsSaved: this.parseNumber(stat.defensiveRunsSaved, 0),
            ultimateZoneRating: this.parseNumber(stat.ultimateZoneRating, 0),
            outsAboveAverage: this.parseNumber(stat.outsAboveAverage, 0),
            fieldingPercentage: this.formatStat(stat.fieldingPercentage, '0'),
            errors: this.parseNumber(stat.errors, 0),
            assists: this.parseNumber(stat.assists, 0),
            putouts: this.parseNumber(stat.putouts, 0)
          };
        }
      }
    }

    return result;
  }

  private static formatStat(value: any, defaultValue: string): string {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num.toFixed(defaultValue.split('.')[1].length);
  }

  private static parseNumber(value: any, defaultValue: number): number {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    const num = parseFloat(value.toString());
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get information about a team's last game
   */
  public static async getLastGame(teamId: string): Promise<LastGameInfo | null> {
    try {
      const response = await axios.get<{ dates: Array<{ games: Array<{ gameDate: string; venue: { name: string } }> }> }>(`${BASE_URL}/schedule`, {
        params: {
          teamId,
          sportId: 1,
          season: CURRENT_MLB_SEASON,
          gameType: 'R',
          limit: 2
        }
      });

      const games = response.data.dates.flatMap(date => date.games);
      if (!games || games.length < 2) return null;

      // Sort games by date
      games.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());

      return {
        date: games[0].gameDate,
        location: games[0].venue.name,
        nextGameLocation: games[1].venue.name
      };
    } catch (error) {
      console.error(`Error fetching last game info for team ${teamId}:`, error);
      return null;
    }
  }

  static async getSituationalStats(teamId: string): Promise<SituationalStats | null> {
    try {
      const cacheKey = `situational_stats_${teamId}`;
      const cachedData = await CacheService.get(cacheKey);
      if (cachedData) {
        return cachedData as SituationalStats;
      }

      const stats = await this.makeApiRequest(`/teams/${teamId}/stats`, {
        stats: 'vsRHP,vsLHP,home,away,last30Days,highLeverage,runnersInScoringPosition',
        group: 'hitting',
        season: CURRENT_MLB_SEASON
      });

      if (!stats || !stats.stats || stats.stats.length === 0) {
        return null;
      }

      const processedStats = this.processSituationalStats(stats.stats);
      await CacheService.set(cacheKey, processedStats, this.CACHE_TTL);
      return processedStats;
    } catch (error) {
      console.error('Error fetching situational stats:', error);
      return null;
    }
  }

  private static processSituationalStats(stats: any[]): SituationalStats {
    const result: Partial<SituationalStats> = {};
    
    stats.forEach(statGroup => {
      const splitType = statGroup.splits[0]?.split?.type;
      if (!splitType) return;

      const stat = statGroup.splits[0].stat;
      const processedStat = {
        avg: this.formatStat(stat.avg, '.000'),
        ops: this.formatStat(stat.ops, '.000'),
        homeRuns: this.parseNumber(stat.homeRuns, 0),
        strikeOutRate: this.formatStat(stat.strikeOutRate, '.000'),
        walkRate: this.formatStat(stat.walkRate, '.000'),
        hardHitRate: this.formatStat(stat.hardHitRate, '.000'),
        barrelRate: this.formatStat(stat.barrelRate, '.000'),
        exitVelocity: this.formatStat(stat.exitVelocity, '.0'),
        launchAngle: this.formatStat(stat.launchAngle, '.0'),
        babip: this.formatStat(stat.babip, '.000'),
        wOBA: this.formatStat(stat.wOBA, '.000'),
        wRCPlus: this.parseNumber(stat.wRCPlus, 100)
      };

      switch (splitType) {
        case 'vsLHP':
          result.vsLeft = processedStat;
          break;
        case 'vsRHP':
          result.vsRight = processedStat;
          break;
        case 'home':
          result.home = processedStat;
          break;
        case 'away':
          result.away = processedStat;
          break;
        case 'last30Days':
          result.last30Days = processedStat;
          break;
        case 'highLeverage':
          result.highLeverage = processedStat;
          break;
        case 'runnersInScoringPosition':
          result.runnersInScoringPosition = processedStat;
          break;
      }
    });

    return result as SituationalStats;
  }

  static async getBullpenUsage(teamId: string): Promise<BullpenStats | null> {
    try {
      const cacheKey = `bullpen_usage_${teamId}`;
      const cachedData = await CacheService.get(cacheKey);
      if (cachedData) {
        return cachedData as BullpenStats;
      }

      const stats = await this.makeApiRequest(`/teams/${teamId}/stats`, {
        stats: 'season,last7Days,last30Days,vsRHP,vsLHP,highLeverage',
        group: 'pitching',
        season: CURRENT_MLB_SEASON
      });

      if (!stats || !stats.stats || stats.stats.length === 0) {
        return null;
      }

      const processedStats = this.processBullpenStats(stats.stats);
      await CacheService.set(cacheKey, processedStats, this.CACHE_TTL);
      return processedStats;
    } catch (error) {
      console.error('Error fetching bullpen usage:', error);
      return null;
    }
  }

  private static processBullpenStats(stats: any[]): BullpenStats {
    const result: Partial<BullpenStats> = {};
    
    stats.forEach(statGroup => {
      const splitType = statGroup.splits[0]?.split?.type;
      if (!splitType) return;

      const stat = statGroup.splits[0].stat;
      const processedStat = {
        era: this.formatStat(stat.era, '0.00'),
        whip: this.formatStat(stat.whip, '0.00'),
        inningsPitched: this.formatStat(stat.inningsPitched, '0.0'),
        strikeOuts: this.parseNumber(stat.strikeOuts, 0),
        walks: this.parseNumber(stat.walks, 0),
        homeRuns: this.parseNumber(stat.homeRuns, 0)
      };

      switch (splitType) {
        case 'season':
          result.era = processedStat.era;
          result.whip = processedStat.whip;
          result.inningsPitched = processedStat.inningsPitched;
          result.strikeOuts = processedStat.strikeOuts;
          result.walks = processedStat.walks;
          result.homeRuns = processedStat.homeRuns;
          break;
        case 'last7Days':
          result.last7Days = {
            ...processedStat,
            usage: {
              highLeverage: this.parseNumber(stat.highLeverageUsage, 0),
              mediumLeverage: this.parseNumber(stat.mediumLeverageUsage, 0),
              lowLeverage: this.parseNumber(stat.lowLeverageUsage, 0)
            },
            restDays: {
              zero: this.parseNumber(stat.zeroDaysRest, 0),
              one: this.parseNumber(stat.oneDayRest, 0),
              two: this.parseNumber(stat.twoDaysRest, 0),
              threePlus: this.parseNumber(stat.threePlusDaysRest, 0)
            }
          };
          break;
        case 'last30Days':
          result.last30Days = processedStat;
          break;
        case 'vsLHP':
          result.splits = {
            ...result.splits,
            vsLeft: {
              era: processedStat.era,
              whip: processedStat.whip,
              strikeOutRate: this.formatStat(stat.strikeOutRate, '.000'),
              walkRate: this.formatStat(stat.walkRate, '.000')
            }
          };
          break;
        case 'vsRHP':
          result.splits = {
            ...result.splits,
            vsRight: {
              era: processedStat.era,
              whip: processedStat.whip,
              strikeOutRate: this.formatStat(stat.strikeOutRate, '.000'),
              walkRate: this.formatStat(stat.walkRate, '.000')
            }
          };
          break;
        case 'highLeverage':
          result.highLeverage = processedStat;
          break;
      }
    });

    return result as BullpenStats;
  }

  private static async makeApiRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const baseUrl = process.env.MLB_STATS_API_URL || 'https://statsapi.mlb.com/api/v1';
    const url = new URL(`${baseUrl}${endpoint}`);
    
    // Add required parameters
    params.hydrate = 'stats(group=[hitting,pitching],type=[vsRHP,vsLHP,home,away,last30Days,season,last7Days])';
    params.fields = 'stats,group,type,splits,stat';
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      console.log(`Making MLB Stats API request to: ${url.toString()}`);
      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`MLB Stats API error response: ${errorText}`);
        throw new Error(`MLB Stats API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error making MLB Stats API request:', error);
      throw error;
    }
  }

  /**
   * Fetch the actual starting pitcher IDs for a given gamePk (game ID) from the MLB API.
   * Returns { homePitcherId, awayPitcherId } or null if not found.
   */
  static async getActualStartingPitchers(gamePk: number): Promise<{ homePitcherId: number, awayPitcherId: number } | null> {
    try {
      // The boxscore endpoint contains the actual starting pitchers
      const response = await axios.get<BoxscoreResponse>(`https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`);
      const boxscore = response.data;
      // Find the pitcher who started for each team
      const homePitchers = boxscore.teams.home.pitchers;
      const awayPitchers = boxscore.teams.away.pitchers;
      // The first pitcher in the list is the starter
      const homePitcherId = homePitchers?.[0];
      const awayPitcherId = awayPitchers?.[0];
      if (homePitcherId && awayPitcherId) {
        return { homePitcherId, awayPitcherId };
      }
      return null;
    } catch (error) {
      console.error(`[MLBStatsService] Error fetching actual starting pitchers for gamePk ${gamePk}:`, error);
      return null;
    }
  }

  /**
   * Search for MLB games by team names and date
   */
  static async searchGames(
    homeTeam: string,
    awayTeam: string,
    gameDate: Date
  ): Promise<MLBGame[]> {
    try {
      const dateStr = gameDate.toISOString().split('T')[0];
      console.log(`[MLBStatsService] Searching for games on ${dateStr}`);
      
      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/schedule?date=${dateStr}&sportId=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const games = data.dates[0]?.games || [];
      
      console.log(`[MLBStatsService] Found ${games.length} games on ${dateStr}`);
      
      // Filter games by team names
      const matchingGames = games.filter((game: MLBGame) => {
        const homeTeamMatch = game.teams.home.team.name.toLowerCase() === homeTeam.toLowerCase();
        const awayTeamMatch = game.teams.away.team.name.toLowerCase() === awayTeam.toLowerCase();
        
        if (homeTeamMatch && awayTeamMatch) {
          console.log(`[MLBStatsService] Found matching game: ${game.teams.home.team.name} vs ${game.teams.away.team.name}`);
          return true;
        }
        
        // Log non-matching games for debugging
        if (game.teams.home.team.name.toLowerCase() === homeTeam.toLowerCase() || 
            game.teams.away.team.name.toLowerCase() === awayTeam.toLowerCase()) {
          console.log(`[MLBStatsService] Partial match found: ${game.teams.home.team.name} vs ${game.teams.away.team.name}`);
          console.log(`[MLBStatsService] Looking for: ${homeTeam} vs ${awayTeam}`);
        }
        
        return false;
      });
      
      console.log(`[MLBStatsService] Found ${matchingGames.length} matching games`);
      return matchingGames;
    } catch (error) {
      console.error('[MLBStatsService] Error searching MLB games:', error);
      return [];
    }
  }
}