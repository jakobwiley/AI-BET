import { PrismaClient, PredictionType, SportType } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const TEAM_NAME_TO_ID: { [key: string]: string } = {
  // NBA Teams
  'Atlanta Hawks': 'ATL',
  'Boston Celtics': 'BOS',
  'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL',
  'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU',
  'Indiana Pacers': 'IND',
  'Los Angeles Clippers': 'LAC',
  'Los Angeles Lakers': 'LAL',
  'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL',
  'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP',
  'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL',
  'Philadelphia 76ers': 'PHI',
  'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC',
  'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTA',
  'Washington Wizards': 'WAS',
  // MLB Teams
  'Arizona Diamondbacks': 'ARI',
  'Atlanta Braves': 'ATL',
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'Chicago Cubs': 'CHC',
  'Chicago White Sox': 'CWS',
  'Cincinnati Reds': 'CIN',
  'Cleveland Guardians': 'CLE',
  'Colorado Rockies': 'COL',
  'Detroit Tigers': 'DET',
  'Houston Astros': 'HOU',
  'Kansas City Royals': 'KCR',
  'Los Angeles Angels': 'LAA',
  'Los Angeles Dodgers': 'LAD',
  'Miami Marlins': 'MIA',
  'Milwaukee Brewers': 'MIL',
  'Minnesota Twins': 'MIN',
  'New York Mets': 'NYM',
  'New York Yankees': 'NYY',
  'Oakland Athletics': 'OAK',
  'Philadelphia Phillies': 'PHI',
  'Pittsburgh Pirates': 'PIT',
  'San Diego Padres': 'SDP',
  'San Francisco Giants': 'SFG',
  'Seattle Mariners': 'SEA',
  'St. Louis Cardinals': 'STL',
  'Tampa Bay Rays': 'TBR',
  'Texas Rangers': 'TEX',
  'Toronto Blue Jays': 'TOR',
  'Washington Nationals': 'WSN'
};

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
}

interface PitcherStats {
  era: number;
  whip: number;
  strikeouts: number;
  innings: number;
  wins: number;
  losses: number;
  lastFiveERA: number;
}

async function getUpcomingGames() {
  const today = new Date('2025-04-24T00:00:00.000Z');
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return prisma.game.findMany({
    where: {
      gameDate: {
        gte: today,
        lt: nextWeek
      },
      status: 'SCHEDULED',
      sport: SportType.MLB // Only fetch MLB games for now
    },
    orderBy: {
      gameDate: 'asc'
    }
  });
}

async function getWeatherData(game: any): Promise<WeatherData | null> {
  // For now, return mock weather data
  // In production, this would call a weather API with stadium location
  return {
    temperature: 72,
    windSpeed: 8,
    windDirection: 'out',
    precipitation: 0
  };
}

async function getPitcherStats(pitcherId: number | null): Promise<PitcherStats | null> {
  if (!pitcherId) return null;

  try {
    // In production, this would fetch from your pitcher stats database
    // For now, return mock stats
    return {
      era: 3.50,
      whip: 1.20,
      strikeouts: 45,
      innings: 50,
      wins: 3,
      losses: 2,
      lastFiveERA: 3.20
    };
  } catch (error) {
    console.error('Error fetching pitcher stats:', error);
    return null;
  }
}

async function getTeamStats(teamName: string) {
  const teamId = TEAM_NAME_TO_ID[teamName];
  if (!teamId) {
    console.error(`No team ID found for team name: ${teamName}`);
    return null;
  }

  try {
    const stats = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamName: teamName },
          { awayTeamName: teamName }
        ],
        status: 'FINAL',
        sport: SportType.MLB
      },
      orderBy: {
        gameDate: 'desc'
      }
    });

    // Calculate team stats from games
    const homeGames = stats.filter(g => g.homeTeamName === teamName);
    const awayGames = stats.filter(g => g.awayTeamName === teamName);
    
    const wins = homeGames.filter(g => g.homeScore! > g.awayScore!).length +
                awayGames.filter(g => g.awayScore! > g.homeScore!).length;
    
    const losses = homeGames.filter(g => g.homeScore! < g.awayScore!).length +
                  awayGames.filter(g => g.awayScore! < g.homeScore!).length;

    const runsScored = homeGames.reduce((sum, g) => sum + (g.homeScore || 0), 0) +
                      awayGames.reduce((sum, g) => sum + (g.awayScore || 0), 0);

    const runsAllowed = homeGames.reduce((sum, g) => sum + (g.awayScore || 0), 0) +
                       awayGames.reduce((sum, g) => sum + (g.homeScore || 0), 0);

    const totalGames = wins + losses;
    
    // Calculate streaks and trends
    const last20Games = stats.slice(0, 20).map(g => ({
      opponent: g.homeTeamName === teamName ? g.awayTeamName : g.homeTeamName,
      runsScored: g.homeTeamName === teamName ? g.homeScore : g.awayScore,
      runsAllowed: g.homeTeamName === teamName ? g.awayScore : g.homeScore,
      isWin: g.homeTeamName === teamName ? g.homeScore! > g.awayScore! : g.awayScore! > g.homeScore!,
      date: g.gameDate
    }));

    const currentStreak = {
      type: last20Games[0]?.isWin ? 'W' : 'L',
      count: 0
    };

    for (const game of last20Games) {
      if ((game.isWin && currentStreak.type === 'W') || (!game.isWin && currentStreak.type === 'L')) {
        currentStreak.count++;
      } else {
        break;
      }
    }

    // Calculate run differentials and trends
    const last5Games = last20Games.slice(0, 5);
    const last10Games = last20Games.slice(0, 10);
    const last20RunDiff = last20Games.reduce((diff, g) => diff + (g.runsScored || 0) - (g.runsAllowed || 0), 0) / 20;
    const last10RunDiff = last10Games.reduce((diff, g) => diff + (g.runsScored || 0) - (g.runsAllowed || 0), 0) / 10;
    const last5RunDiff = last5Games.reduce((diff, g) => diff + (g.runsScored || 0) - (g.runsAllowed || 0), 0) / 5;

    return {
      teamId,
      teamName,
      sport: SportType.MLB,
      wins,
      losses,
      statsJson: {
        avgRunsScored: runsScored / (totalGames || 1),
        avgRunsAllowed: runsAllowed / (totalGames || 1),
        winPercentage: wins / (totalGames || 1),
        currentStreak,
        last20Games,
        trends: {
          last20RunDiff,
          last10RunDiff,
          last5RunDiff,
          improving: last5RunDiff > last10RunDiff && last10RunDiff > last20RunDiff,
          declining: last5RunDiff < last10RunDiff && last10RunDiff < last20RunDiff
        }
      }
    };
  } catch (error) {
    console.error('Error fetching team stats:', error);
    return null;
  }
}

function adjustForWeather(prediction: any, weather: WeatherData | null): void {
  if (!weather) return;

  // Adjust totals based on weather conditions
  if (prediction.type === PredictionType.TOTAL) {
    let weatherImpact = 0;
    
    // Temperature impact
    if (weather.temperature > 80) weatherImpact += 0.3; // Hot weather increases scoring
    if (weather.temperature < 50) weatherImpact -= 0.3; // Cold weather decreases scoring
    
    // Wind impact
    if (weather.windDirection === 'out' && weather.windSpeed > 10) weatherImpact += 0.4;
    if (weather.windDirection === 'in' && weather.windSpeed > 10) weatherImpact -= 0.4;
    
    // Precipitation impact
    if (weather.precipitation > 0) weatherImpact -= 0.2;

    const currentTotal = parseFloat(prediction.value.split(' ')[1]);
    prediction.value = `OVER ${(currentTotal + weatherImpact).toFixed(1)}`;
    prediction.reasoning += `\nWeather Impact: ${weatherImpact > 0 ? '+' : ''}${weatherImpact.toFixed(1)} runs (${weather.temperature}°F, ${weather.windSpeed}mph ${weather.windDirection})`;
  }
}

function adjustForPitchers(prediction: any, homePitcher: PitcherStats | null, awayPitcher: PitcherStats | null): void {
  if (!homePitcher || !awayPitcher) return;

  const homeAdvantage = (awayPitcher.era - homePitcher.era) / 2;
  const pitchingQuality = (homePitcher.lastFiveERA + awayPitcher.lastFiveERA) / 2;

  if (prediction.type === PredictionType.SPREAD) {
    const currentSpread = parseFloat(prediction.value);
    const newSpread = currentSpread + homeAdvantage;
    prediction.value = newSpread >= 0 ? `-${Math.abs(newSpread).toFixed(1)}` : `+${Math.abs(newSpread).toFixed(1)}`;
    prediction.reasoning += `\nPitching Matchup Impact: Home pitcher ERA ${homePitcher.era} vs Away pitcher ERA ${awayPitcher.era}`;
  } 
  else if (prediction.type === PredictionType.TOTAL) {
    const currentTotal = parseFloat(prediction.value.split(' ')[1]);
    const pitchingImpact = 9.0 - pitchingQuality; // Adjust total based on pitching quality
    prediction.value = `OVER ${(currentTotal + pitchingImpact).toFixed(1)}`;
    prediction.reasoning += `\nPitching Impact: ${pitchingImpact > 0 ? '+' : ''}${pitchingImpact.toFixed(1)} runs based on recent performance`;
  }
}

function adjustConfidence(prediction: any, homeStats: any, awayStats: any): void {
  const homeJson = homeStats.statsJson;
  const awayJson = awayStats.statsJson;
  
  let confidenceAdjustment = 0;

  // Streak impact
  if (homeJson.currentStreak.count >= 3) {
    confidenceAdjustment += 0.05 * (homeJson.currentStreak.type === 'W' ? 1 : -1);
  }
  if (awayJson.currentStreak.count >= 3) {
    confidenceAdjustment += 0.05 * (awayJson.currentStreak.type === 'W' ? -1 : 1);
  }

  // Trend impact
  if (homeJson.trends.improving) confidenceAdjustment += 0.05;
  if (homeJson.trends.declining) confidenceAdjustment -= 0.05;
  if (awayJson.trends.improving) confidenceAdjustment -= 0.05;
  if (awayJson.trends.declining) confidenceAdjustment += 0.05;

  // Run differential impact
  const recentFormDiff = homeJson.trends.last5RunDiff - awayJson.trends.last5RunDiff;
  confidenceAdjustment += Math.min(Math.abs(recentFormDiff) * 0.02, 0.1) * Math.sign(recentFormDiff);

  prediction.confidence = Math.min(Math.max(prediction.confidence + confidenceAdjustment, 0.5), 0.95);
  prediction.reasoning += `\nConfidence ${confidenceAdjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(confidenceAdjustment * 100).toFixed(1)}% based on team trends and streaks`;
}

async function calculatePrediction(game: any, type: PredictionType, homeStats: any, awayStats: any): Promise<any> {
  let predictionValue = '';
  let rawConfidence = 0;
  let reasoning = '';

  const homeStatsJson = homeStats.statsJson || {};
  const awayStatsJson = awayStats.statsJson || {};

  // Default values for MLB
  const DEFAULT_TOTAL = 8.5;
  const DEFAULT_MARGIN = 1;
  const HOME_FIELD_ADVANTAGE = 0.3;

  // Calculate base prediction
  if (type === PredictionType.SPREAD) {
    const homeAvgRuns = homeStatsJson.avgRunsScored || DEFAULT_TOTAL / 2;
    const awayAvgRuns = awayStatsJson.avgRunsScored || DEFAULT_TOTAL / 2;
    const homeAvgAllowed = homeStatsJson.avgRunsAllowed || DEFAULT_TOTAL / 2;
    const awayAvgAllowed = awayStatsJson.avgRunsAllowed || DEFAULT_TOTAL / 2;
    
    const expectedMargin = ((homeAvgRuns + awayAvgAllowed) / 2) - ((awayAvgRuns + homeAvgAllowed) / 2) + HOME_FIELD_ADVANTAGE;
    const roundedMargin = Math.round(expectedMargin * 2) / 2;
    
    predictionValue = roundedMargin >= 0 ? `-${Math.abs(roundedMargin).toFixed(1)}` : `+${Math.abs(roundedMargin).toFixed(1)}`;
    rawConfidence = 0.7 + (Math.min(Math.abs(roundedMargin) / 3, 0.2));
    
    reasoning = `Base prediction: ${Math.abs(roundedMargin).toFixed(1)} run ${roundedMargin >= 0 ? 'win by home' : 'win by away'} team`;
  } 
  else if (type === PredictionType.MONEYLINE) {
    const homeWinRate = homeStatsJson.winPercentage || 0.5;
    const awayWinRate = awayStatsJson.winPercentage || 0.5;
    const homeAdvantage = 0.03;
    const homeWinProb = (homeWinRate + homeAdvantage);
    const awayWinProb = awayWinRate;
    const totalProb = homeWinProb + awayWinProb;
    const normalizedHomeProb = homeWinProb / totalProb;
    
    const homeOdds = normalizedHomeProb >= 0.5 
      ? Math.round(-100 / (normalizedHomeProb - 1))
      : Math.round((1 - normalizedHomeProb) * 100);
    
    predictionValue = homeOdds.toString();
    rawConfidence = Math.abs(normalizedHomeProb - 0.5) + 0.65;
    
    reasoning = `Base probability: Home team ${(normalizedHomeProb * 100).toFixed(1)}% (adjusted for home field)`;
  }
  else if (type === PredictionType.TOTAL) {
    const homeAvgRuns = homeStatsJson.avgRunsScored || DEFAULT_TOTAL / 2;
    const awayAvgRuns = awayStatsJson.avgRunsScored || DEFAULT_TOTAL / 2;
    const homeAvgAllowed = homeStatsJson.avgRunsAllowed || DEFAULT_TOTAL / 2;
    const awayAvgAllowed = awayStatsJson.avgRunsAllowed || DEFAULT_TOTAL / 2;
    
    const expectedTotal = ((homeAvgRuns + awayAvgAllowed) + (awayAvgRuns + homeAvgAllowed)) / 2;
    const roundedTotal = Math.round(expectedTotal * 2) / 2;
    
    predictionValue = `OVER ${roundedTotal.toFixed(1)}`;
    rawConfidence = 0.7;
    
    reasoning = `Base total: ${roundedTotal.toFixed(1)} runs expected`;
  }

  const prediction = {
    type,
    value: predictionValue,
    confidence: rawConfidence,
    reasoning,
    recommendation: 'PENDING'
  };

  // Apply adjustments
  const weather = await getWeatherData(game);
  const homePitcher = await getPitcherStats(game.probableHomePitcherId);
  const awayPitcher = await getPitcherStats(game.probableAwayPitcherId);

  adjustForWeather(prediction, weather);
  adjustForPitchers(prediction, homePitcher, awayPitcher);
  adjustConfidence(prediction, homeStats, awayStats);

  // Add streak information
  const homeStreak = homeStatsJson.currentStreak;
  const awayStreak = awayStatsJson.currentStreak;
  prediction.reasoning += `\nStreaks: Home ${homeStreak.type}${homeStreak.count}, Away ${awayStreak.type}${awayStreak.count}`;

  // Add form trends
  prediction.reasoning += `\nForm: Home team ${homeStatsJson.trends.improving ? 'improving' : homeStatsJson.trends.declining ? 'declining' : 'stable'}, Away team ${awayStatsJson.trends.improving ? 'improving' : awayStatsJson.trends.declining ? 'declining' : 'stable'}`;

  prediction.recommendation = prediction.confidence >= 0.7 ? 'ACCEPT' : 'REJECT';
  return prediction;
}

async function main() {
  try {
    const games = await getUpcomingGames();
    console.log(`Found ${games.length} upcoming MLB games`);

    const predictions = [];
    for (const game of games) {
      console.log(`\nAnalyzing ${game.awayTeamName} @ ${game.homeTeamName} (${game.gameDate})`);
      
      const homeStats = await getTeamStats(game.homeTeamName);
      const awayStats = await getTeamStats(game.awayTeamName);

      if (!homeStats || !awayStats) {
        console.log('Missing team stats, skipping predictions');
        continue;
      }

      const gamePredictions = await Promise.all([
        calculatePrediction(game, PredictionType.SPREAD, homeStats, awayStats),
        calculatePrediction(game, PredictionType.MONEYLINE, homeStats, awayStats),
        calculatePrediction(game, PredictionType.TOTAL, homeStats, awayStats)
      ]);

      predictions.push({
        game,
        predictions: gamePredictions.filter(p => p.recommendation === 'ACCEPT')
      });
    }

    // Format predictions with more detailed output
    const output = predictions.map(p => {
      const { game, predictions } = p;
      if (predictions.length === 0) return '';
      
      return `
${game.awayTeamName} @ ${game.homeTeamName}
Date: ${new Date(game.gameDate).toLocaleString()}

${predictions.map(pred => 
  `${pred.type}:
Value: ${pred.value}
Confidence: ${(pred.confidence * 100).toFixed(1)}%
${pred.reasoning}`
).join('\n\n')}
`;
    }).filter(Boolean).join('\n---\n');

    if (output) {
      console.log('\nMLB Predictions Analysis:');
      console.log(output);
    } else {
      console.log('\nNo MLB predictions met the confidence threshold');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

main(); 