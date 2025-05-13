import axios from 'axios';
import JSON5 from 'json5';
import { SportType, GameStatus } from '@prisma/client';
import type { Game } from '@prisma/client';

export class YahooSportsService {
  private static readonly BASE_URL = 'https://sports.yahoo.com/mlb/scoreboard/';
  private static readonly ODDS_URL = 'https://sports.yahoo.com/mlb/odds/';

  /**
   * Fetch today's MLB games from Yahoo Sports by parsing embedded JSON
   */
  static async getTodaysGamesAndOdds(): Promise<{ games: any[]; odds: any[] }> {
    try {
      console.log("Fetching today's MLB games and odds from Yahoo Sports (JSON) ...");
      const response = await axios.get(this.BASE_URL);
      const html = response.data as string;
      // Find the embedded JSON
      const jsonMatch = html.match(/root.App.main = (\{[\s\S]*?\});/);
      if (!jsonMatch) {
        throw new Error('Could not find embedded JSON in Yahoo Sports page');
      }
      // Use JSON5 to parse the JS object
      const json = JSON5.parse(jsonMatch[1]);
      // Traverse to the games data
      const gamesObj = json.context.dispatcher.stores.GamesStore.games;
      const games: any[] = [];
      const odds: any[] = [];
      for (const gameId in gamesObj) {
        if (gameId.startsWith('mlb.g.')) {
          const game = gamesObj[gameId];
          games.push(game);
          if (game.odds) odds.push({ gameId, odds: game.odds });
        }
      }
      return { games, odds };
    } catch (error) {
      console.error('Error fetching games/odds from Yahoo Sports:', error);
      return { games: [], odds: [] };
    }
  }

  /**
   * List all games and spreads for today
   */
  static async listTodaysGamesAndSpreads(): Promise<void> {
    const { games, odds } = await this.getTodaysGamesAndOdds();
    if (!games.length) {
      console.log('No MLB games found for today.');
      return;
    }
    console.log(`\nMLB Games for Today:`);
    for (const game of games) {
      const homeTeam = game.teams ? game.teams[1]?.display_name : 'Unknown';
      const awayTeam = game.teams ? game.teams[0]?.display_name : 'Unknown';
      const startTime = game.status_display_name || game.start_time || 'TBD';
      // Find odds for this game
      let spread = 'N/A';
      let moneyline = 'N/A';
      let total = 'N/A';
      if (game.odds && game.odds['101']) {
        const o = game.odds['101'];
        spread = `${o.away_spread} (${o.away_line}) / ${o.home_spread} (${o.home_line})`;
        moneyline = `Away: ${o.away_ml}, Home: ${o.home_ml}`;
        total = o.total;
      }
      console.log(`- ${awayTeam} @ ${homeTeam} (${startTime}) | Spread: ${spread} | Moneyline: ${moneyline} | Total: ${total}`);
    }
  }

  /**
   * Fetch today's MLB games from Yahoo Sports
   */
  static async getTodaysGames(): Promise<Game[]> {
    try {
      console.log('Fetching today\'s MLB games from Yahoo Sports...');
      const response = await axios.get(this.BASE_URL);
      const $ = cheerio.load(response.data);
      const games: Game[] = [];

      // Find all game containers
      $('.game-container').each((_, element) => {
        const gameElement = $(element);
        
        // Extract team names and records
        const homeTeam = gameElement.find('.home-team .team-name').text().trim();
        const awayTeam = gameElement.find('.away-team .team-name').text().trim();
        const homeRecord = gameElement.find('.home-team .team-record').text().trim();
        const awayRecord = gameElement.find('.away-team .team-record').text().trim();

        // Extract game time
        const gameTime = gameElement.find('.game-time').text().trim();
        const gameDate = new Date();
        const [hours, minutes] = gameTime.split(':').map(Number);
        gameDate.setHours(hours, minutes, 0, 0);

        // Extract probable pitchers
        const homePitcher = gameElement.find('.home-team .probable-pitcher').text().trim();
        const awayPitcher = gameElement.find('.away-team .probable-pitcher').text().trim();

        // Create game object
        const game: Game = {
          id: `mlb-${awayTeam}-${homeTeam}-${gameDate.toISOString().split('T')[0]}`,
          sport: SportType.MLB,
          homeTeamName: homeTeam,
          awayTeamName: awayTeam,
          homeTeamId: homeTeam.toLowerCase().replace(/\s+/g, '-'),
          awayTeamId: awayTeam.toLowerCase().replace(/\s+/g, '-'),
          gameDate: gameDate,
          startTime: gameTime,
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
          oddsJson: null,
          probableHomePitcherId: null,
          probableAwayPitcherId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        games.push(game);
      });

      console.log(`Found ${games.length} MLB games for today`);
      return games;
    } catch (error) {
      console.error('Error fetching games from Yahoo Sports:', error);
      return [];
    }
  }

  /**
   * Fetch odds for today's MLB games
   */
  static async getTodaysOdds(): Promise<Map<string, any>> {
    try {
      console.log('Fetching today\'s MLB odds from Yahoo Sports...');
      const response = await axios.get(this.ODDS_URL);
      const $ = cheerio.load(response.data);
      const oddsMap = new Map<string, any>();

      // Find all game odds containers
      $('.game-odds-container').each((_, element) => {
        const oddsElement = $(element);
        const teams = oddsElement.find('.team-names').text().trim();
        const [awayTeam, homeTeam] = teams.split(' vs ').map(t => t.trim());

        // Extract moneyline odds
        const homeMoneyline = oddsElement.find('.home-team .moneyline').text().trim();
        const awayMoneyline = oddsElement.find('.away-team .moneyline').text().trim();

        // Extract run line
        const homeRunLine = oddsElement.find('.home-team .run-line').text().trim();
        const awayRunLine = oddsElement.find('.away-team .run-line').text().trim();

        // Extract total
        const total = oddsElement.find('.total').text().trim();

        // Create odds object
        const odds = {
          moneyline: {
            home: homeMoneyline,
            away: awayMoneyline
          },
          runLine: {
            home: homeRunLine,
            away: awayRunLine
          },
          total: total
        };

        const gameId = `mlb-${awayTeam}-${homeTeam}-${new Date().toISOString().split('T')[0]}`;
        oddsMap.set(gameId, odds);
      });

      console.log(`Found odds for ${oddsMap.size} MLB games`);
      return oddsMap;
    } catch (error) {
      console.error('Error fetching odds from Yahoo Sports:', error);
      return new Map();
    }
  }

  /**
   * Validate team records against our database
   */
  static async validateTeamRecords(games: Game[]): Promise<Map<string, { wins: number; losses: number }>> {
    const records = new Map<string, { wins: number; losses: number }>();
    
    for (const game of games) {
      const response = await axios.get(this.BASE_URL);
      const $ = cheerio.load(response.data);
      
      // Find team records
      const homeTeamElement = $(`.team-name:contains('${game.homeTeamName}')`).closest('.team-container');
      const awayTeamElement = $(`.team-name:contains('${game.awayTeamName}')`).closest('.team-container');
      
      const homeRecord = homeTeamElement.find('.team-record').text().trim();
      const awayRecord = awayTeamElement.find('.team-record').text().trim();
      
      // Parse records (format: "W-L")
      const [homeWins, homeLosses] = homeRecord.split('-').map(Number);
      const [awayWins, awayLosses] = awayRecord.split('-').map(Number);
      
      records.set(game.homeTeamName, { wins: homeWins, losses: homeLosses });
      records.set(game.awayTeamName, { wins: awayWins, losses: awayLosses });
    }
    
    return records;
  }
} 