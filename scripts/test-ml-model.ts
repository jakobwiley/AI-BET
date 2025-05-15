import { PrismaClient } from '@prisma/client';
import { Game, Prediction, PredictionOutcome } from '../src/models/types.js';
import { MLBStatsService } from '../src/lib/mlbStatsApi.js';
import { OddsApiService } from '../src/lib/oddsApi.js';
import { execSync } from 'child_process';
import { EnhancedPredictionModel, PredictionInput, GameStats } from '../src/lib/enhanced-predictions/enhanced-model.js';
import { PredictionType } from '@prisma/client';
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();
const mlbStatsService = new MLBStatsService();
const oddsApiService = new OddsApiService();
const predictionModel = new EnhancedPredictionModel();

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Add mapping for ambiguous/short team names to full MLB names
const TEAM_NAME_MAP: Record<string, string> = {
  'Minnesota': 'Minnesota Twins',
  'Colorado': 'Colorado Rockies',
  'Arizona': 'Arizona Diamondbacks',
  'Tampa Bay': 'Tampa Bay Rays',
  'Chicago': 'Chicago White Sox', // If you have both Cubs and White Sox, handle accordingly
  'Los Angeles': 'Los Angeles Dodgers', // If you have both Dodgers and Angels, handle accordingly
  'Washington': 'Washington Nationals',
  'Baltimore': 'Baltimore Orioles',
  'Pittsburgh': 'Pittsburgh Pirates',
  'Milwaukee': 'Milwaukee Brewers',
  'Oakland': 'Oakland Athletics',
  'Houston': 'Houston Astros',
  'San Francisco': 'San Francisco Giants',
  'Seattle': 'Seattle Mariners',
  'Boston': 'Boston Red Sox',
  'Kansas City': 'Kansas City Royals',
  'Cincinnati': 'Cincinnati Reds',
  'Texas': 'Texas Rangers',
  'Toronto': 'Toronto Blue Jays',
  'Atlanta': 'Atlanta Braves',
  'St. Louis': 'St. Louis Cardinals',
  'San Diego': 'San Diego Padres',
  'Miami': 'Miami Marlins',
  'Philadelphia': 'Philadelphia Phillies',
  'New York': 'New York Yankees', // If you have both Mets and Yankees, handle accordingly
  'Detroit': 'Detroit Tigers',
  'Cleveland': 'Cleveland Guardians',
  'Tampa Bay Rays': 'Tampa Bay Rays', // for completeness
  'Chicago White Sox': 'Chicago White Sox',
  'Los Angeles Dodgers': 'Los Angeles Dodgers',
  'Toronto Blue Jays': 'Toronto Blue Jays',
  'Texas Rangers': 'Texas Rangers',
  'Minnesota Twins': 'Minnesota Twins',
  'Baltimore Orioles': 'Baltimore Orioles',
  'Oakland Athletics': 'Oakland Athletics',
  'Houston Astros': 'Houston Astros',
  'Washington Nationals': 'Washington Nationals',
  'Cincinnati Reds': 'Cincinnati Reds',
  'San Francisco Giants': 'San Francisco Giants',
  'Seattle Mariners': 'Seattle Mariners',
  'Boston Red Sox': 'Boston Red Sox',
  'Kansas City Royals': 'Kansas City Royals',
  'Milwaukee Brewers': 'Milwaukee Brewers',
  'Pittsburgh Pirates': 'Pittsburgh Pirates',
  'Arizona Diamondbacks': 'Arizona Diamondbacks',
  'Colorado Rockies': 'Colorado Rockies',
  'St. Louis Cardinals': 'St. Louis Cardinals',
  'San Diego Padres': 'San Diego Padres',
  'Miami Marlins': 'Miami Marlins',
  'Philadelphia Phillies': 'Philadelphia Phillies',
  'New York Yankees': 'New York Yankees',
  'Detroit Tigers': 'Detroit Tigers',
  'Cleveland Guardians': 'Cleveland Guardians',
};

function resolveTeamName(name: string): string {
  return TEAM_NAME_MAP[name] || name;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts remaining`);
      await sleep(RETRY_DELAY);
      return fetchWithRetry(fn, retries - 1);
    }
    throw error;
  }
}

function validateGameData(game: any): boolean {
  const requiredFields = ['id', 'homeTeamName', 'awayTeamName', 'gameDate'];
  const missingFields = requiredFields.filter(field => !game[field]);
  if (missingFields.length > 0) {
    console.warn(`Game with id ${game.id || 'N/A'} is missing fields: ${missingFields.join(', ')}`);
    return false;
  }
  return true;
}

async function validateOddsData(odds: any): Promise<boolean> {
  if (!odds) return false;
  const requiredFields = ['spread', 'total', 'moneyline'];
  return requiredFields.some(field => odds[field] !== undefined && odds[field] !== null);
}

async function fetchGamesAndOdds() {
  console.log('--- TEST LOG: Starting game and odds fetch ---');
  
  try {
    // Fetch today's MLB games with retry logic
    const games = await fetchWithRetry(async () => {
      const output = execSync('npx tsx src/scripts/fetch-todays-games.ts').toString();
      const parsedGames = parseGamesOutput(output);
      
      // Validate each game
      const validGames = parsedGames.filter(game => validateGameData(game));
      if (validGames.length === 0) {
        throw new Error('No valid games found');
      }
      
      return validGames;
    });

    console.log(`Successfully fetched ${games.length} games`);

    // Fetch odds for each game with retry logic
    const odds = await fetchWithRetry(async () => {
      const output = execSync('npx tsx src/scripts/show-odds.ts').toString();
      const parsedOdds = parseOddsOutput(output);
      
      // Validate odds data
      const validOdds = parsedOdds.filter(odds => validateOddsData(odds.odds));
      if (validOdds.length === 0) {
        throw new Error('No valid odds found');
      }
      
      return validOdds;
    });

    console.log(`Successfully fetched odds for ${odds.length} games`);

    // Combine games and odds
    const gamesWithOdds = games.map(game => {
      const gameOdds = odds.find(o => o.gameId === game.id);
      return {
        ...game,
        odds: gameOdds ? gameOdds.odds : null
      };
    });

    // Log the combined data
    console.log('Games with odds:', JSON.stringify(gamesWithOdds, null, 2));

    return gamesWithOdds;

  } catch (error) {
    console.error('Error in fetchGamesAndOdds:', error);
    throw error;
  }
}

function parseGamesOutput(output: string): Game[] {
  // Try to find the start of the JSON array with the prefix
  const prefix = '[OddsApiService] Raw MLB API response data:';
  let prefixIdx = output.indexOf(prefix);
  let arrayStart = 0;
  if (prefixIdx !== -1) {
    arrayStart = prefixIdx + prefix.length;
    while (arrayStart < output.length && /\s/.test(output[arrayStart])) arrayStart++;
    if (output[arrayStart] !== '[') prefixIdx = -1; // fallback if not found
  }

  // If prefix not found, fallback to first '[' in output
  if (prefixIdx === -1) {
    arrayStart = output.indexOf('[');
    if (arrayStart === -1) return [];
  }

  // Find the matching closing bracket for the array
  let bracketCount = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < output.length; i++) {
    if (output[i] === '[') bracketCount++;
    if (output[i] === ']') bracketCount--;
    if (bracketCount === 0) {
      arrayEnd = i + 1;
      break;
    }
  }
  if (arrayEnd === -1) return [];

  const jsonArrayStr = output.slice(arrayStart, arrayEnd);
  console.log('Extracted JSON for games:', jsonArrayStr);
  let gamesRaw;
  try {
    gamesRaw = JSON.parse(jsonArrayStr);
  } catch {
    return [];
  }
  // Debug log for parsed games
  console.log('Parsed gamesRaw:', gamesRaw);
  return gamesRaw.map((g: any) => ({
    id: g.id,
    sport: 'MLB',
    homeTeamId: '',
    awayTeamId: '',
    homeTeamName: g.home_team,
    awayTeamName: g.away_team,
    gameDate: g.commence_time ? g.commence_time.split('T')[0] : '',
    startTime: g.commence_time,
    status: 'SCHEDULED'
  }));
}

function parseOddsOutput(output: string): { gameId: string; odds: any }[] {
  const odds: { gameId: string; odds: any }[] = [];
  const gameRegex = /(.*?) @ (.*?)\nGame Time: (.*?)\nOdds: ([\s\S]*?)(?=\n\w|$)/g;
  let match;

  while ((match = gameRegex.exec(output)) !== null) {
    const awayTeam = match[1].trim();
    const homeTeam = match[2].trim();
    let oddsBlock = (match[4] || '').trim();

    // Only process MLB games (skip NBA, etc)
    if (
      homeTeam === 'Denver Nuggets' ||
      awayTeam === 'Oklahoma City Thunder'
    ) {
      continue;
    }

    // Add closing brace for the entire odds block if missing
    if (oddsBlock && !oddsBlock.endsWith('}')) {
      oddsBlock += '}';
    }

    console.log('Fixed odds block for parsing:', oddsBlock);

    try {
      const oddsData = JSON.parse(oddsBlock);
      odds.push({
        gameId: `${homeTeam}-${awayTeam}`,
        odds: oddsData
      });
    } catch (error) {
      console.error(`Error parsing odds for ${awayTeam} @ ${homeTeam}:`, error);
      console.error('Problematic odds block:', oddsBlock);
    }
  }

  return odds;
}

async function getTodaysGames() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await prisma.game.findMany({
    where: {
      sport: 'MLB',
      gameDate: {
        gte: today,
        lt: tomorrow
      }
    }
  });
}

async function main() {
  try {
    console.log('Fetching today\'s games from database...');
    const games = await getTodaysGames();
    console.log(`Found ${games.length} games for today`);

    const model = new EnhancedPredictionModel();
    const predictions = [];

    for (const game of games) {
      console.log(`\nAnalyzing ${game.awayTeamName} @ ${game.homeTeamName}...`);
      
      const odds = game.oddsJson as any;
      if (!odds || !odds.spread || !odds.moneyline || !odds.total) {
        console.log('Skipping game due to missing odds data');
        continue;
      }

      // Get team stats and recent performance
      const homeTeamStats = await MLBStatsService.getTeamStats(resolveTeamName(game.homeTeamName));
      const awayTeamStats = await MLBStatsService.getTeamStats(resolveTeamName(game.awayTeamName));
      
      // Calculate win rates
      const homeWinRate = homeTeamStats ? homeTeamStats.wins / (homeTeamStats.wins + homeTeamStats.losses) : 0.5;
      const awayWinRate = awayTeamStats ? awayTeamStats.wins / (awayTeamStats.wins + awayTeamStats.losses) : 0.5;

      // Calculate recent scores based on team stats
      const recentHomeScores = homeTeamStats ? [
        homeTeamStats.avgRunsScored || 0,
        homeTeamStats.avgRunsScored || 0,
        homeTeamStats.avgRunsScored || 0
      ] : [0, 0, 0];

      const recentAwayScores = awayTeamStats ? [
        awayTeamStats.avgRunsScored || 0,
        awayTeamStats.avgRunsScored || 0,
        awayTeamStats.avgRunsScored || 0
      ] : [0, 0, 0];

      // Get comprehensive team stats
      const homeTeamSituational = await MLBStatsService.getSituationalStats(game.homeTeamId);
      const awayTeamSituational = await MLBStatsService.getSituationalStats(game.awayTeamId);
      const homeBullpen = await MLBStatsService.getBullpenUsage(game.homeTeamId);
      const awayBullpen = await MLBStatsService.getBullpenUsage(game.awayTeamId);
      const homeWeather = await MLBStatsService.getWeatherImpact(game.homeTeamId);
      const awayWeather = await MLBStatsService.getWeatherImpact(game.awayTeamId);

      // Calculate offensive metrics with park factors
      const homeOffense = homeTeamStats ? {
        avgRuns: homeTeamStats.avgRunsScored,
        parkFactorHomeRuns: homeTeamStats.parkFactorHomeRuns || 1.0,
        ops: homeTeamStats.ops || 0,
        wOBA: homeTeamStats.wOBA || 0,
        wRCPlus: homeTeamStats.wRCPlus || 100,
        hardHitRate: homeTeamStats.hardHitRate || 0,
        barrelRate: homeTeamStats.barrelRate || 0,
        exitVelocity: homeTeamStats.exitVelocity || 0,
        launchAngle: homeTeamStats.launchAngle || 0,
        babip: homeTeamStats.babip || 0,
        iso: homeTeamStats.iso || 0,
        strikeOutRate: homeTeamStats.strikeOutRate || 0,
        walkRate: homeTeamStats.walkRate || 0
      } : null;

      const awayOffense = awayTeamStats ? {
        avgRuns: awayTeamStats.avgRunsScored,
        parkFactorHomeRuns: awayTeamStats.parkFactorHomeRuns || 1.0,
        ops: awayTeamStats.ops || 0,
        wOBA: awayTeamStats.wOBA || 0,
        wRCPlus: awayTeamStats.wRCPlus || 100,
        hardHitRate: awayTeamStats.hardHitRate || 0,
        barrelRate: awayTeamStats.barrelRate || 0,
        exitVelocity: awayTeamStats.exitVelocity || 0,
        launchAngle: awayTeamStats.launchAngle || 0,
        babip: awayTeamStats.babip || 0,
        iso: awayTeamStats.iso || 0,
        strikeOutRate: awayTeamStats.strikeOutRate || 0,
        walkRate: awayTeamStats.walkRate || 0
      } : null;

      // Calculate pitching metrics with advanced stats
      const homePitching = homeTeamStats ? {
        era: homeTeamStats.era || 0,
        whip: homeTeamStats.whip || 0,
        kPer9: homeTeamStats.kPer9 || 0,
        bbPer9: homeTeamStats.bbPer9 || 0,
        hrPer9: homeTeamStats.hrPer9 || 0,
        fip: homeTeamStats.fip || 0,
        xFIP: homeTeamStats.xFIP || 0,
        groundBallRate: homeTeamStats.groundBallRate || 0,
        flyBallRate: homeTeamStats.flyBallRate || 0,
        spinRate: homeTeamStats.spinRate || 0,
        pitchVelocity: homeTeamStats.pitchVelocity || 0
      } : null;

      const awayPitching = awayTeamStats ? {
        era: awayTeamStats.era || 0,
        whip: awayTeamStats.whip || 0,
        kPer9: awayTeamStats.kPer9 || 0,
        bbPer9: awayTeamStats.bbPer9 || 0,
        hrPer9: awayTeamStats.hrPer9 || 0,
        fip: awayTeamStats.fip || 0,
        xFIP: awayTeamStats.xFIP || 0,
        groundBallRate: awayTeamStats.groundBallRate || 0,
        flyBallRate: awayTeamStats.flyBallRate || 0,
        spinRate: awayTeamStats.spinRate || 0,
        pitchVelocity: awayTeamStats.pitchVelocity || 0
      } : null;
      
      // Analyze each prediction type
      const predictionTypes = [PredictionType.SPREAD, PredictionType.MONEYLINE, PredictionType.TOTAL] as const;
      const gamePredictions = [];

      for (const type of predictionTypes) {
        let predictionValue: string;
        let rawConfidence: number;
        let confidenceFactors: number[] = [];
        let avgConfidenceFactor: number;

        switch (type) {
          case PredictionType.SPREAD:
            predictionValue = odds.spread.homeSpread.toString();
            
            // Calculate expected margin based on comprehensive metrics
            let expectedMargin = 0;
            confidenceFactors = [];

            // Offensive factors with park adjustments
            if (homeOffense && awayOffense) {
              const homeOffensiveRating = (homeOffense.avgRuns * 1.1) + // Home team scoring boost
                                        (homeOffense.ops * 2) + // OPS impact
                                        (homeOffense.wOBA * 3) + // wOBA impact
                                        (homeOffense.wRCPlus * 0.02) + // wRC+ impact
                                        (homeOffense.hardHitRate * 0.5) + // Hard hit impact
                                        (homeOffense.barrelRate * 0.8) + // Barrel impact
                                        (homeOffense.exitVelocity * 0.1) + // Exit velocity impact
                                        (homeOffense.launchAngle * 0.05) + // Launch angle impact
                                        (homeOffense.babip * 0.3) + // BABIP impact
                                        (homeOffense.iso * 0.4) + // ISO impact
                                        (homeOffense.walkRate * 0.6) - // Walk rate impact
                                        (homeOffense.strikeOutRate * 0.4); // Strikeout impact
              
              const awayOffensiveRating = (awayOffense.avgRuns * 0.9) + // Away team scoring penalty
                                        (awayOffense.ops * 2) + // OPS impact
                                        (awayOffense.wOBA * 3) + // wOBA impact
                                        (awayOffense.wRCPlus * 0.02) + // wRC+ impact
                                        (awayOffense.hardHitRate * 0.5) + // Hard hit impact
                                        (awayOffense.barrelRate * 0.8) + // Barrel impact
                                        (awayOffense.exitVelocity * 0.1) + // Exit velocity impact
                                        (awayOffense.launchAngle * 0.05) + // Launch angle impact
                                        (awayOffense.babip * 0.3) + // BABIP impact
                                        (awayOffense.iso * 0.4) + // ISO impact
                                        (awayOffense.walkRate * 0.6) - // Walk rate impact
                                        (awayOffense.strikeOutRate * 0.4); // Strikeout impact

              // Apply park factors
              const parkFactor = (homeOffense.parkFactorHomeRuns + awayOffense.parkFactorHomeRuns) / 2;
              const offensiveDiff = (homeOffensiveRating - awayOffensiveRating) * parkFactor;
              expectedMargin += offensiveDiff * 0.5;
              
              confidenceFactors.push(Math.abs(offensiveDiff) / 10);
              confidenceFactors.push(Math.abs(parkFactor - 1.0) * 2);
            }

            // Pitching factors with advanced metrics
            if (homePitching && awayPitching) {
              const homePitchingRating = (homePitching.era * -0.5) + // ERA impact (negative is better)
                                       (homePitching.whip * -2) + // WHIP impact (negative is better)
                                       (homePitching.kPer9 * 0.2) + // Strikeout impact
                                       (homePitching.bbPer9 * -0.3) + // Walk impact (negative is better)
                                       (homePitching.hrPer9 * -0.4) + // Home run impact (negative is better)
                                       (homePitching.fip * -0.3) + // FIP impact (negative is better)
                                       (homePitching.xFIP * -0.3) + // xFIP impact (negative is better)
                                       (homePitching.groundBallRate * 0.2) + // Ground ball impact
                                       (homePitching.flyBallRate * -0.2) + // Fly ball impact (negative is better)
                                       (homePitching.spinRate * 0.01) + // Spin rate impact
                                       (homePitching.pitchVelocity * 0.02); // Velocity impact

              const awayPitchingRating = (awayPitching.era * -0.5) + // ERA impact (negative is better)
                                       (awayPitching.whip * -2) + // WHIP impact (negative is better)
                                       (awayPitching.kPer9 * 0.2) + // Strikeout impact
                                       (awayPitching.bbPer9 * -0.3) + // Walk impact (negative is better)
                                       (awayPitching.hrPer9 * -0.4) + // Home run impact (negative is better)
                                       (awayPitching.fip * -0.3) + // FIP impact (negative is better)
                                       (awayPitching.xFIP * -0.3) + // xFIP impact (negative is better)
                                       (awayPitching.groundBallRate * 0.2) + // Ground ball impact
                                       (awayPitching.flyBallRate * -0.2) + // Fly ball impact (negative is better)
                                       (awayPitching.spinRate * 0.01) + // Spin rate impact
                                       (awayPitching.pitchVelocity * 0.02); // Velocity impact

              const pitchingDiff = homePitchingRating - awayPitchingRating;
              expectedMargin += pitchingDiff * 0.3;
              confidenceFactors.push(Math.abs(pitchingDiff) / 5);
            }

            // Situational factors with detailed splits
            if (homeTeamSituational && awayTeamSituational) {
              const homeSituationalRating = homeTeamSituational.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              const awaySituationalRating = awayTeamSituational.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              
              // Add day/night split impact
              const homeDayNightRating = homeTeamSituational.stats?.[0]?.splits?.[1]?.stat?.runsScored || 0;
              const awayDayNightRating = awayTeamSituational.stats?.[0]?.splits?.[1]?.stat?.runsScored || 0;
              
              const situationalDiff = (homeSituationalRating - awaySituationalRating) / 10;
              const dayNightDiff = (homeDayNightRating - awayDayNightRating) / 20;
              
              expectedMargin += situationalDiff + dayNightDiff;
              confidenceFactors.push(Math.abs(situationalDiff) * 2);
              confidenceFactors.push(Math.abs(dayNightDiff) * 2);
            }

            // Bullpen factors with detailed metrics
            if (homeBullpen && awayBullpen) {
              const homeBullpenRating = homeBullpen.stats?.[0]?.splits?.[0]?.stat?.era || 0;
              const awayBullpenRating = awayBullpen.stats?.[0]?.splits?.[0]?.stat?.era || 0;
              
              // Add inherited runners impact
              const homeInheritedRunners = homeBullpen.stats?.[0]?.splits?.[0]?.stat?.inheritedRunners || 0;
              const awayInheritedRunners = awayBullpen.stats?.[0]?.splits?.[0]?.stat?.inheritedRunners || 0;
              
              const bullpenDiff = (awayBullpenRating - homeBullpenRating) / 10; // Negative ERA is better
              const inheritedDiff = (homeInheritedRunners - awayInheritedRunners) / 20;
              
              expectedMargin += bullpenDiff + inheritedDiff;
              confidenceFactors.push(Math.abs(bullpenDiff) * 2);
              confidenceFactors.push(Math.abs(inheritedDiff));
            }

            // Weather impact with detailed conditions
            if (homeWeather && awayWeather) {
              const homeWeatherRating = homeWeather.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              const awayWeatherRating = awayWeather.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              
              // Add temperature and wind impact
              const homeTemp = homeWeather.stats?.[0]?.splits?.[0]?.stat?.temperature || 70;
              const awayTemp = awayWeather.stats?.[0]?.splits?.[0]?.stat?.temperature || 70;
              const homeWind = homeWeather.stats?.[0]?.splits?.[0]?.stat?.windSpeed || 0;
              const awayWind = awayWeather.stats?.[0]?.splits?.[0]?.stat?.windSpeed || 0;
              
              const weatherDiff = (homeWeatherRating - awayWeatherRating) / 10;
              const tempDiff = (homeTemp - awayTemp) / 100;
              const windDiff = (homeWind - awayWind) / 20;
              
              expectedMargin += weatherDiff + tempDiff + windDiff;
              confidenceFactors.push(Math.abs(weatherDiff) * 2);
              confidenceFactors.push(Math.abs(tempDiff) * 2);
              confidenceFactors.push(Math.abs(windDiff));
            }

            // Calculate confidence based on multiple factors
            avgConfidenceFactor = confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length;
            rawConfidence = 0.5 + (avgConfidenceFactor * 0.3);

            // Determine prediction based on expected margin
            const spread = parseFloat(odds.spread.homeSpread);
            if (expectedMargin > spread) {
              predictionValue = odds.spread.homeSpread.toString();
            } else {
              predictionValue = odds.spread.awaySpread.toString();
            }
            break;

          case PredictionType.MONEYLINE:
            predictionValue = odds.moneyline.homeOdds.toString();
            
            // Calculate win probability based on comprehensive metrics
            let homeWinProbability = 0.5;
            confidenceFactors = [];

            // Offensive factors with park adjustments
            if (homeOffense && awayOffense) {
              const homeOffensiveRating = (homeOffense.avgRuns * 1.1) + // Home team scoring boost
                                        (homeOffense.ops * 2) + // OPS impact
                                        (homeOffense.wOBA * 3) + // wOBA impact
                                        (homeOffense.wRCPlus * 0.02) + // wRC+ impact
                                        (homeOffense.hardHitRate * 0.5) + // Hard hit impact
                                        (homeOffense.barrelRate * 0.8) + // Barrel impact
                                        (homeOffense.exitVelocity * 0.1) + // Exit velocity impact
                                        (homeOffense.launchAngle * 0.05) + // Launch angle impact
                                        (homeOffense.babip * 0.3) + // BABIP impact
                                        (homeOffense.iso * 0.4) + // ISO impact
                                        (homeOffense.walkRate * 0.6) - // Walk rate impact
                                        (homeOffense.strikeOutRate * 0.4); // Strikeout impact
              
              const awayOffensiveRating = (awayOffense.avgRuns * 0.9) + // Away team scoring penalty
                                        (awayOffense.ops * 2) + // OPS impact
                                        (awayOffense.wOBA * 3) + // wOBA impact
                                        (awayOffense.wRCPlus * 0.02) + // wRC+ impact
                                        (awayOffense.hardHitRate * 0.5) + // Hard hit impact
                                        (awayOffense.barrelRate * 0.8) + // Barrel impact
                                        (awayOffense.exitVelocity * 0.1) + // Exit velocity impact
                                        (awayOffense.launchAngle * 0.05) + // Launch angle impact
                                        (awayOffense.babip * 0.3) + // BABIP impact
                                        (awayOffense.iso * 0.4) + // ISO impact
                                        (awayOffense.walkRate * 0.6) - // Walk rate impact
                                        (awayOffense.strikeOutRate * 0.4); // Strikeout impact

              // Apply park factors
              const parkFactor = (homeOffense.parkFactorHomeRuns + awayOffense.parkFactorHomeRuns) / 2;
              const offensiveDiff = (homeOffensiveRating - awayOffensiveRating) * parkFactor;
              homeWinProbability += offensiveDiff * 0.1;
              
              confidenceFactors.push(Math.abs(offensiveDiff) / 10);
              confidenceFactors.push(Math.abs(parkFactor - 1.0) * 2);
            }

            // Pitching factors with advanced metrics
            if (homePitching && awayPitching) {
              const homePitchingRating = (homePitching.era * -0.5) + // ERA impact (negative is better)
                                       (homePitching.whip * -2) + // WHIP impact (negative is better)
                                       (homePitching.kPer9 * 0.2) + // Strikeout impact
                                       (homePitching.bbPer9 * -0.3) + // Walk impact (negative is better)
                                       (homePitching.hrPer9 * -0.4) + // Home run impact (negative is better)
                                       (homePitching.fip * -0.3) + // FIP impact (negative is better)
                                       (homePitching.xFIP * -0.3) + // xFIP impact (negative is better)
                                       (homePitching.groundBallRate * 0.2) + // Ground ball impact
                                       (homePitching.flyBallRate * -0.2) + // Fly ball impact (negative is better)
                                       (homePitching.spinRate * 0.01) + // Spin rate impact
                                       (homePitching.pitchVelocity * 0.02); // Velocity impact

              const awayPitchingRating = (awayPitching.era * -0.5) + // ERA impact (negative is better)
                                       (awayPitching.whip * -2) + // WHIP impact (negative is better)
                                       (awayPitching.kPer9 * 0.2) + // Strikeout impact
                                       (awayPitching.bbPer9 * -0.3) + // Walk impact (negative is better)
                                       (awayPitching.hrPer9 * -0.4) + // Home run impact (negative is better)
                                       (awayPitching.fip * -0.3) + // FIP impact (negative is better)
                                       (awayPitching.xFIP * -0.3) + // xFIP impact (negative is better)
                                       (awayPitching.groundBallRate * 0.2) + // Ground ball impact
                                       (awayPitching.flyBallRate * -0.2) + // Fly ball impact (negative is better)
                                       (awayPitching.spinRate * 0.01) + // Spin rate impact
                                       (awayPitching.pitchVelocity * 0.02); // Velocity impact

              const pitchingDiff = homePitchingRating - awayPitchingRating;
              homeWinProbability += pitchingDiff * 0.15;
              confidenceFactors.push(Math.abs(pitchingDiff) / 5);
            }

            // Situational factors with detailed splits
            if (homeTeamSituational && awayTeamSituational) {
              const homeSituationalRating = homeTeamSituational.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              const awaySituationalRating = awayTeamSituational.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              
              // Add day/night split impact
              const homeDayNightRating = homeTeamSituational.stats?.[0]?.splits?.[1]?.stat?.runsScored || 0;
              const awayDayNightRating = awayTeamSituational.stats?.[0]?.splits?.[1]?.stat?.runsScored || 0;
              
              const situationalDiff = (homeSituationalRating - awaySituationalRating) / 10;
              const dayNightDiff = (homeDayNightRating - awayDayNightRating) / 20;
              
              homeWinProbability += situationalDiff + dayNightDiff;
              confidenceFactors.push(Math.abs(situationalDiff) * 2);
              confidenceFactors.push(Math.abs(dayNightDiff) * 2);
            }

            // Bullpen factors with detailed metrics
            if (homeBullpen && awayBullpen) {
              const homeBullpenRating = homeBullpen.stats?.[0]?.splits?.[0]?.stat?.era || 0;
              const awayBullpenRating = awayBullpen.stats?.[0]?.splits?.[0]?.stat?.era || 0;
              
              // Add inherited runners impact
              const homeInheritedRunners = homeBullpen.stats?.[0]?.splits?.[0]?.stat?.inheritedRunners || 0;
              const awayInheritedRunners = awayBullpen.stats?.[0]?.splits?.[0]?.stat?.inheritedRunners || 0;
              
              const bullpenDiff = (awayBullpenRating - homeBullpenRating) / 10; // Negative ERA is better
              const inheritedDiff = (homeInheritedRunners - awayInheritedRunners) / 20;
              
              homeWinProbability += bullpenDiff + inheritedDiff;
              confidenceFactors.push(Math.abs(bullpenDiff) * 2);
              confidenceFactors.push(Math.abs(inheritedDiff));
            }

            // Weather impact with detailed conditions
            if (homeWeather && awayWeather) {
              const homeWeatherRating = homeWeather.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              const awayWeatherRating = awayWeather.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              
              // Add temperature and wind impact
              const homeTemp = homeWeather.stats?.[0]?.splits?.[0]?.stat?.temperature || 70;
              const awayTemp = awayWeather.stats?.[0]?.splits?.[0]?.stat?.temperature || 70;
              const homeWind = homeWeather.stats?.[0]?.splits?.[0]?.stat?.windSpeed || 0;
              const awayWind = awayWeather.stats?.[0]?.splits?.[0]?.stat?.windSpeed || 0;
              
              const weatherDiff = (homeWeatherRating - awayWeatherRating) / 10;
              const tempDiff = (homeTemp - awayTemp) / 100;
              const windDiff = (homeWind - awayWind) / 20;
              
              homeWinProbability += weatherDiff + tempDiff + windDiff;
              confidenceFactors.push(Math.abs(weatherDiff) * 2);
              confidenceFactors.push(Math.abs(tempDiff) * 2);
              confidenceFactors.push(Math.abs(windDiff));
            }

            // Calculate confidence based on multiple factors
            avgConfidenceFactor = confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length;
            rawConfidence = 0.5 + (avgConfidenceFactor * 0.3);

            // Determine prediction based on win probability
            const homeOdds = parseFloat(odds.moneyline.homeOdds);
            const impliedHomeProb = homeOdds > 0 ? 100 / (homeOdds + 100) : Math.abs(homeOdds) / (Math.abs(homeOdds) + 100);
            
            if (homeWinProbability > impliedHomeProb) {
              predictionValue = odds.moneyline.homeOdds.toString();
            } else {
              predictionValue = odds.moneyline.awayOdds.toString();
            }
            break;

          case PredictionType.TOTAL:
            predictionValue = odds.total.overUnder.toString();
            const total = parseFloat(odds.total.overUnder);
            
            // Calculate expected runs based on comprehensive metrics
            let expectedTotal = 0;
            confidenceFactors = [];

            // Offensive factors with park adjustments
            if (homeOffense && awayOffense) {
              const homeExpectedRuns = (homeOffense.avgRuns * 1.1) + // Home team scoring boost
                                     (homeOffense.ops * 2) + // OPS impact
                                     (homeOffense.wOBA * 3) + // wOBA impact
                                     (homeOffense.wRCPlus * 0.02) + // wRC+ impact
                                     (homeOffense.hardHitRate * 0.5) + // Hard hit impact
                                     (homeOffense.barrelRate * 0.8) + // Barrel impact
                                     (homeOffense.exitVelocity * 0.1) + // Exit velocity impact
                                     (homeOffense.launchAngle * 0.05) + // Launch angle impact
                                     (homeOffense.babip * 0.3) + // BABIP impact
                                     (homeOffense.iso * 0.4) + // ISO impact
                                     (homeOffense.walkRate * 0.6) - // Walk rate impact
                                     (homeOffense.strikeOutRate * 0.4); // Strikeout impact
              
              const awayExpectedRuns = (awayOffense.avgRuns * 0.9) + // Away team scoring penalty
                                     (awayOffense.ops * 2) + // OPS impact
                                     (awayOffense.wOBA * 3) + // wOBA impact
                                     (awayOffense.wRCPlus * 0.02) + // wRC+ impact
                                     (awayOffense.hardHitRate * 0.5) + // Hard hit impact
                                     (awayOffense.barrelRate * 0.8) + // Barrel impact
                                     (awayOffense.exitVelocity * 0.1) + // Exit velocity impact
                                     (awayOffense.launchAngle * 0.05) + // Launch angle impact
                                     (awayOffense.babip * 0.3) + // BABIP impact
                                     (awayOffense.iso * 0.4) + // ISO impact
                                     (awayOffense.walkRate * 0.6) - // Walk rate impact
                                     (awayOffense.strikeOutRate * 0.4); // Strikeout impact

              // Apply park factors
              const parkFactor = (homeOffense.parkFactorHomeRuns + awayOffense.parkFactorHomeRuns) / 2;
              expectedTotal = (homeExpectedRuns + awayExpectedRuns) * parkFactor;
              
              confidenceFactors.push(Math.abs(homeExpectedRuns - awayExpectedRuns) / 10);
              confidenceFactors.push(Math.abs(parkFactor - 1.0) * 2);
            }

            // Pitching factors with advanced metrics
            if (homePitching && awayPitching) {
              const homePitchingFactor = (homePitching.era * 0.5) + // ERA impact
                                       (homePitching.whip * 2) + // WHIP impact
                                       (homePitching.kPer9 * 0.2) - // Strikeout impact
                                       (homePitching.bbPer9 * 0.3) + // Walk impact
                                       (homePitching.hrPer9 * 0.4) + // Home run impact
                                       (homePitching.fip * 0.3) + // FIP impact
                                       (homePitching.xFIP * 0.3) + // xFIP impact
                                       (homePitching.groundBallRate * 0.2) - // Ground ball impact
                                       (homePitching.flyBallRate * 0.2) + // Fly ball impact
                                       (homePitching.spinRate * 0.01) + // Spin rate impact
                                       (homePitching.pitchVelocity * 0.02); // Velocity impact

              const awayPitchingFactor = (awayPitching.era * 0.5) + // ERA impact
                                       (awayPitching.whip * 2) + // WHIP impact
                                       (awayPitching.kPer9 * 0.2) - // Strikeout impact
                                       (awayPitching.bbPer9 * 0.3) + // Walk impact
                                       (awayPitching.hrPer9 * 0.4) + // Home run impact
                                       (awayPitching.fip * 0.3) + // FIP impact
                                       (awayPitching.xFIP * 0.3) + // xFIP impact
                                       (awayPitching.groundBallRate * 0.2) - // Ground ball impact
                                       (awayPitching.flyBallRate * 0.2) + // Fly ball impact
                                       (awayPitching.spinRate * 0.01) + // Spin rate impact
                                       (awayPitching.pitchVelocity * 0.02); // Velocity impact

              expectedTotal -= (homePitchingFactor + awayPitchingFactor) / 2;
              confidenceFactors.push(Math.abs(homePitchingFactor - awayPitchingFactor) / 5);
            }

            // Situational factors with detailed splits
            if (homeTeamSituational && awayTeamSituational) {
              const homeSituationalFactor = homeTeamSituational.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              const awaySituationalFactor = awayTeamSituational.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              
              // Add day/night split impact
              const homeDayNightSplit = homeTeamSituational.stats?.[0]?.splits?.[1]?.stat?.runsScored || 0;
              const awayDayNightSplit = awayTeamSituational.stats?.[0]?.splits?.[1]?.stat?.runsScored || 0;
              
              expectedTotal += (homeSituationalFactor + awaySituationalFactor) / 2;
              expectedTotal += (homeDayNightSplit + awayDayNightSplit) / 4;
              
              confidenceFactors.push(Math.abs(homeSituationalFactor - awaySituationalFactor) / 8);
              confidenceFactors.push(Math.abs(homeDayNightSplit - awayDayNightSplit) / 6);
            }

            // Bullpen factors with detailed metrics
            if (homeBullpen && awayBullpen) {
              const homeBullpenFactor = homeBullpen.stats?.[0]?.splits?.[0]?.stat?.era || 0;
              const awayBullpenFactor = awayBullpen.stats?.[0]?.splits?.[0]?.stat?.era || 0;
              
              // Add inherited runners impact
              const homeInheritedRunners = homeBullpen.stats?.[0]?.splits?.[0]?.stat?.inheritedRunners || 0;
              const awayInheritedRunners = awayBullpen.stats?.[0]?.splits?.[0]?.stat?.inheritedRunners || 0;
              
              expectedTotal -= (homeBullpenFactor + awayBullpenFactor) / 4;
              expectedTotal += (homeInheritedRunners + awayInheritedRunners) / 10;
              
              confidenceFactors.push(Math.abs(homeBullpenFactor - awayBullpenFactor) / 6);
              confidenceFactors.push(Math.abs(homeInheritedRunners - awayInheritedRunners) / 8);
            }

            // Weather impact with detailed conditions
            if (homeWeather && awayWeather) {
              const homeWeatherFactor = homeWeather.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              const awayWeatherFactor = awayWeather.stats?.[0]?.splits?.[0]?.stat?.runsScored || 0;
              
              // Add temperature and wind impact
              const homeTemp = homeWeather.stats?.[0]?.splits?.[0]?.stat?.temperature || 70;
              const awayTemp = awayWeather.stats?.[0]?.splits?.[0]?.stat?.temperature || 70;
              const homeWind = homeWeather.stats?.[0]?.splits?.[0]?.stat?.windSpeed || 0;
              const awayWind = awayWeather.stats?.[0]?.splits?.[0]?.stat?.windSpeed || 0;
              
              expectedTotal += (homeWeatherFactor + awayWeatherFactor) / 2;
              expectedTotal += ((homeTemp + awayTemp) - 140) / 20; // Temperature impact
              expectedTotal += (homeWind + awayWind) / 10; // Wind impact
              
              confidenceFactors.push(Math.abs(homeWeatherFactor - awayWeatherFactor) / 7);
              confidenceFactors.push(Math.abs(homeTemp - awayTemp) / 10);
              confidenceFactors.push(Math.abs(homeWind - awayWind) / 5);
            }

            // Determine over/under based on expected total
            const recentTotalTrend = expectedTotal > total ? 'OVER' : 'UNDER';
            predictionValue = `${recentTotalTrend} ${total}`;

            // Calculate confidence based on multiple factors
            avgConfidenceFactor = confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length;
            rawConfidence = 0.5 + (avgConfidenceFactor * 0.3);
            break;
        }

        const quality = model.getPredictionQuality({
          predictionType: type,
          rawConfidence,
          predictionValue,
          game: {
            homeTeamName: game.homeTeamName,
            awayTeamName: game.awayTeamName,
            status: game.status,
            homeScore: 0,
            awayScore: 0
          },
          recentHomeScores,
          recentAwayScores,
          homeTeamWinRate: homeWinRate,
          awayTeamWinRate: awayWinRate
        });

        gamePredictions.push({
          type,
          quality
        });
      }

      predictions.push({
        game: `${game.awayTeamName} @ ${game.homeTeamName}`,
        predictions: gamePredictions
      });
    }

    // Print predictions
    console.log('\n=== Today\'s Predictions ===\n');
    for (const prediction of predictions) {
      console.log(`${prediction.game}:`);
      for (const pred of prediction.predictions) {
        console.log(`${pred.type}:`);
        console.log(`  Recommendation: ${pred.quality.recommendation}`);
        console.log(`  Confidence: ${pred.quality.confidence}`);
        if (pred.quality.warning) {
          console.log(`  Warning: ${pred.quality.warning}`);
        }
        console.log();
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 