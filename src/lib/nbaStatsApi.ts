import axios from 'axios';
import { TeamStats, H2HStats } from './predictionService';

const BASE_URL = 'https://stats.nba.com/stats';

interface NBAStatsResponse {
  resultSets: Array<{
    name: string;
    headers: string[];
    rowSet: Array<Array<string | number>>;
  }>;
}

interface TeamAdvancedStats {
  pace?: number;
  offensiveRating?: number;
  defensiveRating?: number;
  netRating?: number;
  trueShootingPercentage?: number;
  effectiveFieldGoalPercentage?: number;
}

// Mapping from common team name variations (lowercase) to stats.nba.com Team IDs
// Source: Needs verification from stats.nba.com API or reliable source
// Populate with more teams as needed.
const NBA_STATS_API_TEAM_IDS: Record<string, number> = {
  'atlanta hawks': 1610612737,
  'hawks': 1610612737,
  'boston celtics': 1610612738,
  'celtics': 1610612738,
  'brooklyn nets': 1610612751,
  'nets': 1610612751,
  'charlotte hornets': 1610612766,
  'hornets': 1610612766,
  'chicago bulls': 1610612741,
  'bulls': 1610612741,
  'cleveland cavaliers': 1610612739,
  'cavaliers': 1610612739,
  'dallas mavericks': 1610612742,
  'mavericks': 1610612742,
  'denver nuggets': 1610612743,
  'nuggets': 1610612743,
  'detroit pistons': 1610612765,
  'pistons': 1610612765,
  'golden state warriors': 1610612744,
  'warriors': 1610612744,
  'houston rockets': 1610612745,
  'rockets': 1610612745,
  'indiana pacers': 1610612754,
  'pacers': 1610612754,
  'la clippers': 1610612746,
  'los angeles clippers': 1610612746,
  'clippers': 1610612746,
  'los angeles lakers': 1610612747,
  'lakers': 1610612747,
  'memphis grizzlies': 1610612763,
  'grizzlies': 1610612763,
  'miami heat': 1610612748,
  'heat': 1610612748,
  'milwaukee bucks': 1610612749,
  'bucks': 1610612749,
  'minnesota timberwolves': 1610612750,
  'timberwolves': 1610612750,
  'new orleans pelicans': 1610612740,
  'pelicans': 1610612740,
  'new york knicks': 1610612752,
  'knicks': 1610612752,
  'oklahoma city thunder': 1610612760,
  'thunder': 1610612760,
  'orlando magic': 1610612753,
  'magic': 1610612753,
  'philadelphia 76ers': 1610612755,
  '76ers': 1610612755,
  'phoenix suns': 1610612756,
  'suns': 1610612756,
  'portland trail blazers': 1610612757,
  'trail blazers': 1610612757,
  'sacramento kings': 1610612758,
  'kings': 1610612758,
  'san antonio spurs': 1610612759,
  'spurs': 1610612759,
  'toronto raptors': 1610612761,
  'raptors': 1610612761,
  'utah jazz': 1610612762,
  'jazz': 1610612762,
  'washington wizards': 1610612764,
  'wizards': 1610612764,
};

export class NBAStatsService {
  private static async getTeamId(teamName: string): Promise<number | null> {
    const normalizedName = teamName.toLowerCase();
    const id = NBA_STATS_API_TEAM_IDS[normalizedName];
    if (id === undefined) {
      console.warn(`[NBAStatsService] NBA Stats API Team ID not found for: ${teamName}`);
      return null;
    }
    return id;
  }

  private static async fetchAdvancedTeamStats(teamId: number, season: string): Promise<TeamAdvancedStats | null> {
    try {
      const url = `${BASE_URL}/leaguedashteamstats`;
      const params = {
        MeasureType: 'Advanced',
        PerMode: 'PerGame',
        PlusMinus: 'N',
        PaceAdjust: 'N',
        Rank: 'N',
        Season: season,
        SeasonSegment: '',
        SeasonType: 'Regular Season',
        ShotClockRange: '',
        TeamID: teamId,
        VsConference: '',
        VsDivision: '',
        VsPlayerID: '',
        VsTeamID: '',
        TwoWay: '0',
        GameScope: '',
        PlayerScope: '',
        StarterBench: '',
        PlayerPosition: '',
        GameSegment: '',
        Period: '0',
        LastNGames: '0',
        Location: '',
        Month: '0',
        OpponentTeamID: '0',
        Outcome: '',
        PORound: '0',
        PlayerID: '0',
        Conference: '',
        DateFrom: '',
        DateTo: '',
        Division: '',
        DraftPick: '',
        DraftYear: '',
        Height: '',
        Weight: '',
      };

      const response = await axios.get<NBAStatsResponse>(url, {
        params,
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Host': 'stats.nba.com',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.nba.com/',
          'Connection': 'keep-alive',
        },
      });

      const stats = response.data.resultSets[0];
      if (!stats || !stats.rowSet || stats.rowSet.length === 0) {
        console.warn(`[NBAStatsService] No advanced stats found for team ID ${teamId}`);
        return null;
      }

      const row = stats.rowSet[0];
      const headers = stats.headers;
      
      return {
        pace: this.getStatValue(row, headers, 'PACE'),
        offensiveRating: this.getStatValue(row, headers, 'OFF_RATING'),
        defensiveRating: this.getStatValue(row, headers, 'DEF_RATING'),
        netRating: this.getStatValue(row, headers, 'NET_RATING'),
        trueShootingPercentage: this.getStatValue(row, headers, 'TS_PCT'),
        effectiveFieldGoalPercentage: this.getStatValue(row, headers, 'EFG_PCT'),
      };
    } catch (error) {
      console.error(`[NBAStatsService] Error fetching advanced stats for team ${teamId}:`, error);
      return null;
    }
  }

  private static getStatValue(row: Array<string | number>, headers: string[], statName: string): number | undefined {
    const index = headers.indexOf(statName);
    if (index === -1) return undefined;
    const value = row[index];
    return typeof value === 'number' ? value : parseFloat(value as string);
  }

  public static async getTeamStats(teamName: string): Promise<TeamStats | null> {
    try {
      const teamId = await this.getTeamId(teamName);
      if (!teamId) return null;

      const currentSeason = '2023-24';
      const advancedStats = await this.fetchAdvancedTeamStats(teamId, currentSeason);
      if (!advancedStats) return null;

      return {
        wins: 0,
        losses: 0,
        homeWins: 0,
        homeLosses: 0,
        awayWins: 0,
        awayLosses: 0,
        lastTenWins: 0,
        pace: advancedStats.pace,
        offensiveRating: advancedStats.offensiveRating,
        defensiveRating: advancedStats.defensiveRating,
      };
    } catch (error) {
      console.error(`[NBAStatsService] Error getting team stats for ${teamName}:`, error);
      return null;
    }
  }

  public static async getH2HStats(team1Name: string, team2Name: string): Promise<H2HStats | null> {
    try {
      const team1Id = await this.getTeamId(team1Name);
      const team2Id = await this.getTeamId(team2Name);
      if (!team1Id || !team2Id) return null;

      // For now, return basic H2H stats structure
      // TODO: Implement actual H2H stats fetching from NBA Stats API
      return {
        totalGames: 0,
        homeTeamWins: 0,
        awayTeamWins: 0,
        averagePointsDiff: 0,
      };
    } catch (error) {
      console.error(`[NBAStatsService] Error getting H2H stats for ${team1Name} vs ${team2Name}:`, error);
      return null;
    }
  }
} 