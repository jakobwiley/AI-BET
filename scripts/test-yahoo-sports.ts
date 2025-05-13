import { YahooSportsService } from '../src/lib/yahooSportsApi';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function testYahooSports() {
  try {
    console.log('Testing Yahoo Sports integration...\n');

    // Debug: Log HTML structure
    console.log('Fetching raw HTML from Yahoo Sports...');
    const response = await axios.get('https://sports.yahoo.com/mlb/scoreboard/');
    const $ = cheerio.load(response.data as string);
    
    console.log('\nHTML Structure:');
    console.log('Game containers:', $('.game-container').length);
    console.log('Team names:', $('.team-name').length);
    console.log('Game times:', $('.game-time').length);
    
    // Log first game container HTML for debugging
    const firstGame = $('.game-container').first();
    console.log('\nFirst game container HTML:');
    console.log(firstGame.html());

    // 1. Test fetching games
    console.log('\nFetching today\'s games...');
    const games = await YahooSportsService.getTodaysGames();
    console.log(`Found ${games.length} games:`);
    games.forEach(game => {
      console.log(`- ${game.awayTeamName} @ ${game.homeTeamName} (${game.startTime})`);
    });
    console.log();

    // 2. Test fetching odds
    console.log('Fetching odds...');
    const oddsMap = await YahooSportsService.getTodaysOdds();
    console.log(`Found odds for ${oddsMap.size} games:`);
    oddsMap.forEach((odds, gameId) => {
      console.log(`\nGame ID: ${gameId}`);
      console.log('Moneyline:', odds.moneyline);
      console.log('Run Line:', odds.runLine);
      console.log('Total:', odds.total);
    });
    console.log();

    // 3. Test validating team records
    console.log('Validating team records...');
    const teamRecords = await YahooSportsService.validateTeamRecords(games);
    console.log(`Validated records for ${teamRecords.size} teams:`);
    teamRecords.forEach((record, teamName) => {
      console.log(`- ${teamName}: ${record.wins}-${record.losses}`);
    });

  } catch (error) {
    console.error('Error testing Yahoo Sports integration:', error);
  }
}

// Run the test
testYahooSports(); 