import { Game, Prediction } from '../../models/types.js';
import { PredictionType } from '@prisma/client';
import { EnhancedMLBDataService } from './enhancedMLBDataService.js';
import { AdvancedAnalyticsService } from './advancedAnalyticsService.js';
import { MLModelService } from './mlModelService.js';
import { TeamStats, H2HStats } from '../predictionService.js';

export class EnhancedPredictionService {
  static async generatePrediction(
    game: Game,
    homeStats: TeamStats,
    awayStats: TeamStats,
    h2hStats: H2HStats
  ): Promise<Prediction> {
    try {
      console.log(`[EnhancedPredictionService] Generating prediction for game ${game.id}`);
      
      // Get enhanced data
      const [homeHistorical, awayHistorical] = await Promise.all([
        EnhancedMLBDataService.getHistoricalPerformance(game.homeTeamId),
        EnhancedMLBDataService.getHistoricalPerformance(game.awayTeamId)
      ]);

      const [homeTravel, awayTravel] = await Promise.all([
        EnhancedMLBDataService.getTeamTravelInfo(game.homeTeamId, game.gameDate),
        EnhancedMLBDataService.getTeamTravelInfo(game.awayTeamId, game.gameDate)
      ]);

      const weatherData = await EnhancedMLBDataService.getWeatherData(
        game.gameDate,
        game.homeTeamName
      );

      // Get advanced analytics data
      const [homeSituational, awaySituational] = await Promise.all([
        AdvancedAnalyticsService.getSituationalStats(game.homeTeamId),
        AdvancedAnalyticsService.getSituationalStats(game.awayTeamId)
      ]);

      const [homeBullpen, awayBullpen] = await Promise.all([
        AdvancedAnalyticsService.getBullpenUsage(game.homeTeamId),
        AdvancedAnalyticsService.getBullpenUsage(game.awayTeamId)
      ]);

      const parkFactors = await AdvancedAnalyticsService.getParkFactors(game.homeTeamName);

      let confidence = 0.6;
      const reasoning: string[] = [];

      // Analyze historical performance
      if (homeHistorical && awayHistorical) {
        // Last 30 days analysis
        const home30DayWinPct = homeHistorical.last30Days.wins / (homeHistorical.last30Days.wins + homeHistorical.last30Days.losses);
        const away30DayWinPct = awayHistorical.last30Days.wins / (awayHistorical.last30Days.wins + awayHistorical.last30Days.losses);
        
        if (home30DayWinPct > away30DayWinPct) {
          confidence += 0.05;
          reasoning.push(`Home team has better 30-day record (${home30DayWinPct.toFixed(3)} vs ${away30DayWinPct.toFixed(3)})`);
        }

        // Last 7 days analysis
        const home7DayWinPct = homeHistorical.last7Days.wins / (homeHistorical.last7Days.wins + homeHistorical.last7Days.losses);
        const away7DayWinPct = awayHistorical.last7Days.wins / (awayHistorical.last7Days.wins + awayHistorical.last7Days.losses);
        
        if (home7DayWinPct > away7DayWinPct) {
          confidence += 0.05;
          reasoning.push(`Home team has better 7-day record (${home7DayWinPct.toFixed(3)} vs ${away7DayWinPct.toFixed(3)})`);
        }
      }

      // Analyze travel and rest
      if (homeTravel && awayTravel) {
        // Rest days advantage
        if (homeTravel.restDays > awayTravel.restDays) {
          confidence += 0.03;
          reasoning.push(`Home team has more rest days (${homeTravel.restDays} vs ${awayTravel.restDays})`);
        }

        // Travel distance impact
        if (awayTravel.travelDistance > 1000) {
          confidence += 0.02;
          reasoning.push(`Away team has significant travel (${awayTravel.travelDistance} miles)`);
        }

        // Time zone change impact
        if (Math.abs(awayTravel.timeZoneChange) > 2) {
          confidence += 0.02;
          reasoning.push(`Away team has significant time zone change (${awayTravel.timeZoneChange} hours)`);
        }
      }

      // Analyze weather impact
      if (weatherData) {
        // Temperature impact
        if (weatherData.temperature > 85) {
          confidence += 0.02;
          reasoning.push(`Hot weather (${weatherData.temperature}°F) favors offense`);
        } else if (weatherData.temperature < 50) {
          confidence -= 0.02;
          reasoning.push(`Cold weather (${weatherData.temperature}°F) may impact offense`);
        }

        // Wind impact
        if (weatherData.windSpeed > 15) {
          confidence -= 0.03;
          reasoning.push(`Strong winds (${weatherData.windSpeed} mph) may impact game`);
        }

        // Precipitation impact
        if (weatherData.precipitation > 0.1) {
          confidence -= 0.02;
          reasoning.push(`Chance of precipitation may impact game`);
        }
      }

      // Analyze situational statistics
      if (homeSituational && awaySituational) {
        // RISP performance
        if (homeSituational.runnersInScoringPosition.battingAverage > awaySituational.runnersInScoringPosition.battingAverage) {
          confidence += 0.03;
          reasoning.push('Home team has better performance with runners in scoring position');
        }

        // Late inning performance
        if (homeSituational.lateInningPressure.innings7to9.ops > awaySituational.lateInningPressure.innings7to9.ops) {
          confidence += 0.02;
          reasoning.push('Home team has better late-inning performance');
        }
      }

      // Analyze bullpen usage and fatigue
      if (homeBullpen && awayBullpen) {
        const homeFatigue = AdvancedAnalyticsService.analyzeBullpenFatigue(homeBullpen);
        const awayFatigue = AdvancedAnalyticsService.analyzeBullpenFatigue(awayBullpen);

        if (homeFatigue < awayFatigue) {
          confidence += 0.03;
          reasoning.push('Home team has better bullpen availability');
        }

        if (homeBullpen.availablePitchers > awayBullpen.availablePitchers) {
          confidence += 0.02;
          reasoning.push(`Home team has more available pitchers (${homeBullpen.availablePitchers} vs ${awayBullpen.availablePitchers})`);
        }
      }

      // Apply park factors to statistics
      if (parkFactors) {
        const adjustedHomeStats = AdvancedAnalyticsService.adjustStatsForPark(
          this.extractRawStats(homeStats),
          parkFactors
        );
        const adjustedAwayStats = AdvancedAnalyticsService.adjustStatsForPark(
          this.extractRawStats(awayStats),
          parkFactors
        );

        // Compare park-adjusted stats
        if (adjustedHomeStats.homeRuns > adjustedAwayStats.homeRuns) {
          confidence += 0.02;
          reasoning.push('Home team has better park-adjusted power numbers');
        }
      }

      // Analyze player statistics
      const homePlayerAnalysis = this.analyzePlayerStats(homeStats);
      const awayPlayerAnalysis = this.analyzePlayerStats(awayStats);

      if (homePlayerAnalysis.battingStrength > awayPlayerAnalysis.battingStrength) {
        confidence += 0.05;
        reasoning.push('Home team has stronger batting lineup');
      }

      if (homePlayerAnalysis.pitchingStrength > awayPlayerAnalysis.pitchingStrength) {
        confidence += 0.05;
        reasoning.push('Home team has stronger pitching staff');
      }

      // Calculate final prediction
      const homeAdvantage = 0.04; // 4% home field advantage
      const rawConfidence = Math.min(0.95, Math.max(0.5, confidence + homeAdvantage));
      
      // Get calibrated confidence from ML model service
      const calibratedConfidence = await MLModelService.getCalibratedConfidence(
        'enhanced',
        Math.round(rawConfidence * 100)
      );

      const prediction = calibratedConfidence > 60 ? 'HOME' : 'AWAY';

      return {
        id: `${game.id}-enhanced`,
        gameId: game.id,
        predictionType: PredictionType.MONEYLINE,
        predictionValue: prediction,
        confidence: calibratedConfidence,
        grade: this.calculateGrade(calibratedConfidence / 100),
        reasoning: reasoning.join('\n'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[EnhancedPredictionService] Error generating prediction for game ${game.id}:`, error);
      throw error;
    }
  }

  private static extractRawStats(stats: TeamStats): Record<string, number> {
    return {
      homeRuns: stats.keyPlayers?.batting.reduce((acc, player) => acc + parseFloat(player.ops), 0) || 0,
      hits: stats.keyPlayers?.batting.reduce((acc, player) => acc + parseFloat(player.avg), 0) || 0,
      doubles: 0, // TODO: Add doubles to player stats
      triples: 0, // TODO: Add triples to player stats
      walks: 0, // TODO: Add walks to player stats
      strikeouts: 0 // TODO: Add strikeouts to player stats
    };
  }

  private static analyzePlayerStats(stats?: TeamStats | null) {
    if (!stats?.keyPlayers) return {
      battingStrength: 0,
      pitchingStrength: 0,
      keyBatters: [],
      keyPitchers: []
    };

    const battingStrength = stats.keyPlayers.batting.reduce((acc, player) => {
      const ops = parseFloat(player.ops);
      const wRCPlus = player.wRCPlus;
      return acc + (ops * 0.6 + (wRCPlus / 150) * 0.4);
    }, 0) / Math.max(stats.keyPlayers.batting.length, 1);

    const pitchingStrength = stats.keyPlayers.pitching.reduce((acc, player) => {
      const era = parseFloat(player.era);
      const whip = parseFloat(player.whip);
      const fip = parseFloat(player.fip);
      return acc + ((4.5 - era) * 0.4 + (1.3 - whip) * 0.3 + (4.5 - fip) * 0.3);
    }, 0) / Math.max(stats.keyPlayers.pitching.length, 1);

    const keyBatters = stats.keyPlayers.batting
      .sort((a, b) => parseFloat(b.ops) - parseFloat(a.ops))
      .slice(0, 3);

    const keyPitchers = stats.keyPlayers.pitching
      .sort((a, b) => parseFloat(a.era) - parseFloat(b.era))
      .slice(0, 2);

    return {
      battingStrength,
      pitchingStrength,
      keyBatters,
      keyPitchers
    };
  }

  private static calculateGrade(confidence: number): string {
    if (confidence >= 0.85) return 'A+';
    if (confidence >= 0.80) return 'A';
    if (confidence >= 0.75) return 'A-';
    if (confidence >= 0.70) return 'B+';
    if (confidence >= 0.65) return 'B';
    if (confidence >= 0.60) return 'B-';
    if (confidence >= 0.55) return 'C+';
    if (confidence >= 0.50) return 'C';
    return 'C-';
  }
} 