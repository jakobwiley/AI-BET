import { Game, Prediction, PredictionType } from '../models/types.js';

// Team statistics interface
export interface TeamStats {
  wins: number;
  losses: number;
  homeWins?: number;
  homeLosses?: number;
  awayWins?: number;
  awayLosses?: number;
  pointsFor: number;
  pointsAgainst: number;
  lastTenGames: string; // e.g., "7-3"
  streak: number;
  winPercentage: number;
  homeWinPercentage?: number;
  awayWinPercentage?: number;
  // Sport-specific stats
  pace?: number; // NBA pace
  offensiveRating?: number;
  defensiveRating?: number;
  // MLB specific
  runsScored?: number;
  runsAllowed?: number;
  battingAverage?: number;
  era?: number;
  avgRunsScored?: number;
  avgRunsAllowed?: number;
  teamERA?: number;
  teamWHIP?: number;
  avgVsLHP?: number;
  opsVsLHP?: number;
  avgVsRHP?: number;
  opsVsRHP?: number;
  lastTenWins?: number;
  // Player statistics
  keyPlayers?: {
    batting: Array<{
      avg: string;
      obp: string;
      slg: string;
      ops: string;
      wOBA: string;
      wRCPlus: number;
      war: string;
    }>;
    pitching: Array<{
      era: string;
      whip: string;
      fip: string;
      xfip: string;
      k9: string;
      bb9: string;
      war: string;
    }>;
  };
}

// Head-to-head statistics interface
export interface H2HStats {
  homeTeamWins: number;
  awayTeamWins: number;
  totalGames: number;
  lastMeetingDate: string;
  lastMeetingResult: string;
  averagePointsHome?: number;
  averagePointsAway?: number;
  // Sport-specific stats
  averageTotalPoints?: number; // NBA
  averagePointsDiff?: number; // NBA
  averageRunsScored?: number; // MLB
  averageRunsAllowed?: number; // MLB
  averageRunsDiff?: number; // MLB
}

export class PredictionService {
  static async generatePrediction(
    gameId: string, 
    type: PredictionType,
    game: Game,
    homeStats?: TeamStats | null,
    awayStats?: TeamStats | null,
    h2hStats?: H2HStats | null,
    confidence: number = 0.60 + (Math.random() * 0.30)
  ): Promise<Prediction> {
    try {
      console.log(`[PredictionService] Generating ${type} prediction for game ${gameId}`);
      
      let predictionValue = '0';
      let reasoning = '';
      
      // Enhanced form calculation with weighted recent performance and matchup advantages
      const calculateTeamForm = (stats?: TeamStats | null, isHome: boolean = false) => {
        if (!stats) return { form: 'unknown', score: 0, matchupAdvantage: 0 };
        const lastTenWins = parseInt(stats.lastTenGames?.split('-')[0] || '0');
        const lastFiveWins = stats.lastTenWins || 0;
        
        // Weight recent performance more heavily
        const weightedScore = (lastTenWins * 0.5) + (lastFiveWins * 0.5);
        
        // Calculate matchup advantages
        let matchupAdvantage = 0;
        if (game.sport === 'MLB') {
          // Add pitcher handedness advantage
          const vsLefty = isHome ? stats.avgVsLHP || 0 : stats.opsVsLHP || 0;
          const vsRighty = isHome ? stats.avgVsRHP || 0 : stats.opsVsRHP || 0;
          matchupAdvantage = Math.max(vsLefty, vsRighty) * 0.2;
        }
        
        return {
          form: weightedScore >= 7.5 ? 'elite' :
                weightedScore >= 6.5 ? 'excellent' :
                weightedScore >= 5.5 ? 'strong' :
                weightedScore >= 4.5 ? 'average' :
                weightedScore >= 3.5 ? 'struggling' : 'poor',
          score: weightedScore,
          matchupAdvantage
        };
      };

      const homeFormData = calculateTeamForm(homeStats, true);
      const awayFormData = calculateTeamForm(awayStats, false);

      const h2hHistory = h2hStats ? 
        `${h2hStats.homeTeamWins}-${h2hStats.awayTeamWins} in ${h2hStats.totalGames} games` :
        'no previous meetings';
      
      // Enhanced advanced metrics with momentum and efficiency
      const calculateAdvancedMetrics = (stats?: TeamStats | null, isHome: boolean = false) => {
        const baseNetRating = ((stats?.offensiveRating || 0) - (stats?.defensiveRating || 0));
        const locationAdvantage = isHome ? 
          PredictionService.calculateHomeWinPercentage(stats) :
          PredictionService.calculateAwayWinPercentage(stats);
        
        // Calculate momentum score based on streak and recent performance
        const momentumScore = ((stats?.streak || 0) * 0.3) + 
                            (parseInt(stats?.lastTenGames?.split('-')[0] || '0') * 0.7);
        
        // Sport-specific efficiency metrics
        const efficiencyScore = game.sport === 'NBA' ?
          (((stats?.offensiveRating || 0) / 110) + ((120 - (stats?.defensiveRating || 120)) / 110)) / 2 :
          (((4.50 - (stats?.teamERA || 4.50)) / 4.50) + ((stats?.teamWHIP || 1.30) / 1.30)) / 2;
        
        return {
          netRating: baseNetRating.toFixed(1),
          winStreak: stats?.streak || 0,
          locationImpact: locationAdvantage * 100, // Convert to percentage for display
          recentMomentum: momentumScore,
          efficiency: efficiencyScore.toFixed(3),
          performanceScore: (
            (baseNetRating * 0.3) +
            (locationAdvantage * 0.3) +
            (momentumScore * 0.2) +
            (efficiencyScore * 0.2)
          ).toFixed(2)
        };
      };

      const homeAdvancedMetrics = calculateAdvancedMetrics(homeStats, true);
      const awayAdvancedMetrics = calculateAdvancedMetrics(awayStats, false);

      // Add player stats analysis for MLB games
      if (game.sport === 'MLB') {
        const analyzePlayerStats = (stats?: TeamStats | null) => {
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
        };

        const homePlayerAnalysis = analyzePlayerStats(homeStats);
        const awayPlayerAnalysis = analyzePlayerStats(awayStats);

        // Add player stats to reasoning for MLB games
        if (type === 'MONEYLINE' || type === 'SPREAD') {
          reasoning += `\n\nKey Player Analysis:
${game.homeTeamName}:
• Batting Strength: ${homePlayerAnalysis.battingStrength.toFixed(3)}
• Pitching Strength: ${homePlayerAnalysis.pitchingStrength.toFixed(3)}
• Top Hitters: ${homePlayerAnalysis.keyBatters.map(p => `${p.ops} OPS, ${p.wRCPlus} wRC+`).join(', ')}
• Key Pitchers: ${homePlayerAnalysis.keyPitchers.map(p => `${p.era} ERA, ${p.whip} WHIP`).join(', ')}

${game.awayTeamName}:
• Batting Strength: ${awayPlayerAnalysis.battingStrength.toFixed(3)}
• Pitching Strength: ${awayPlayerAnalysis.pitchingStrength.toFixed(3)}
• Top Hitters: ${awayPlayerAnalysis.keyBatters.map(p => `${p.ops} OPS, ${p.wRCPlus} wRC+`).join(', ')}
• Key Pitchers: ${awayPlayerAnalysis.keyPitchers.map(p => `${p.era} ERA, ${p.whip} WHIP`).join(', ')}`;

          // Adjust confidence based on player stats
          const playerStatsImpact = (
            (homePlayerAnalysis.battingStrength - awayPlayerAnalysis.battingStrength) * 0.3 +
            (homePlayerAnalysis.pitchingStrength - awayPlayerAnalysis.pitchingStrength) * 0.7
          ) * 0.1;

          confidence = Math.min(0.90, Math.max(0.60, confidence + playerStatsImpact));
        }
      }

      // ... rest of the existing code ...

      const prediction: Prediction = {
        id: `${game.id}-${type}`,
        gameId: game.id,
        predictionType: type,
        predictionValue: predictionValue,
        confidence: Math.round(confidence * 100), // Convert to percentage
        grade: this.calculateGrade(confidence),
        reasoning: reasoning,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return prediction;
    } catch (error) {
      console.error(`[PredictionService] Error generating prediction for game ${game.id}:`, error);
      throw error;
    }
  }

  private static calculateGrade(confidence: number): string {
    if (confidence >= 0.85) return 'A';
    if (confidence >= 0.75) return 'B';
    if (confidence >= 0.65) return 'C';
    if (confidence >= 0.55) return 'D';
    return 'F';
  }

  static async getPredictionsForGame(
    game: Game,
    homeStats?: TeamStats | null,
    awayStats?: TeamStats | null,
    h2hStats?: H2HStats | null
  ): Promise<Prediction[]> {
    try {
      console.log(`[PredictionService] Generating predictions for game ${game.id}`, {
        sport: game.sport,
        homeTeam: game.homeTeamName,
        awayTeam: game.awayTeamName,
        date: game.gameDate,
        status: game.status,
        odds: game.odds
      });

      const predictionTypes: PredictionType[] = ['SPREAD', 'MONEYLINE', 'TOTAL'];
      const predictions = await Promise.all(
        predictionTypes.map(type => {
          let confidence = 0.60 + (Math.random() * 0.30);
          
          if (homeStats && awayStats) {
            // Enhanced confidence calculations
            const homeWinPct = homeStats.wins / (homeStats.wins + homeStats.losses || 1);
            const awayWinPct = awayStats.wins / (awayStats.wins + awayStats.losses || 1);
            const recordFactor = Math.abs(homeWinPct - awayWinPct);
            
            const homeRecentWins = parseInt(homeStats.lastTenGames?.split('-')[0] ?? '0');
            const awayRecentWins = parseInt(awayStats.lastTenGames?.split('-')[0] ?? '0');
            const recentFormFactor = Math.abs(homeRecentWins - awayRecentWins) / 10;
            
            const streakImpact = (homeStats.streak - awayStats.streak) * 0.02;
            const homeAdvantage = ((homeStats.homeWinPercentage || 0.5) - 0.5) * 0.1;
            
            confidence += recordFactor * 0.15;
            confidence += recentFormFactor * 0.15;
            confidence += streakImpact;
            confidence += homeAdvantage;

            // Sport-specific confidence adjustments
            if (game.sport === 'NBA') {
              const netRatingDiff = ((homeStats.offensiveRating || 0) - (homeStats.defensiveRating || 0)) -
                                  ((awayStats.offensiveRating || 0) - (awayStats.defensiveRating || 0));
              confidence += (netRatingDiff / 10) * 0.05;
            } else {
              const eraDiff = (awayStats.teamERA || 0) - (homeStats.teamERA || 0);
              confidence += (eraDiff / 5) * 0.05;
            }
          }
          
          if (h2hStats && h2hStats.totalGames > 0) {
            const h2hWinPct = h2hStats.homeTeamWins / h2hStats.totalGames;
            const h2hFactor = Math.abs(h2hWinPct - 0.5) * 2;
            const recentH2hImpact = h2hStats.lastMeetingResult.includes(game.homeTeamName) ? 0.05 : -0.05;
            
            confidence += h2hFactor * 0.15;
            confidence += recentH2hImpact;
          }
          
          confidence = Math.min(0.90, confidence);
          
          return this.generatePrediction(game.id, type, game, homeStats, awayStats, h2hStats, confidence);
        })
      );

      return predictions;
    } catch (error) {
      console.error(`[PredictionService] Error generating predictions for game ${game.id}:`, error);
      throw error;
    }
  }

  private static calculateHomeWinPercentage(stats: any): number {
    if (!stats?.homeWins || !stats?.homeLosses) return 0.5;
    return stats.homeWins / (stats.homeWins + stats.homeLosses);
  }

  private static calculateAwayWinPercentage(stats: any): number {
    if (!stats?.awayWins || !stats?.awayLosses) return 0.5;
    return stats.awayWins / (stats.awayWins + stats.awayLosses);
  }
} 