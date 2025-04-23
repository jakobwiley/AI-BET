import { Game, Prediction, PredictionType } from '@/models/types';

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
      
      let predictionValue = 0;
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

      console.log(`[PredictionService] Enhanced Advanced Metrics - Home Team:`, {
        ...homeAdvancedMetrics,
        matchupAdvantage: homeFormData.matchupAdvantage
      });
      console.log(`[PredictionService] Enhanced Advanced Metrics - Away Team:`, {
        ...awayAdvancedMetrics,
        matchupAdvantage: awayFormData.matchupAdvantage
      });
      
      switch (type) {
        case 'SPREAD':
          predictionValue = game.odds?.spread?.homeSpread || 0;
          reasoning = `Based on comprehensive analysis:
- ${game.homeTeamName} (${homeStats?.wins || 0}-${homeStats?.losses || 0}): ${homeFormData.form} form, ${homeStats?.lastTenGames || 'N/A'} in last 10
  • Net Rating: ${homeAdvancedMetrics.netRating}
  • Home Court Impact: ${homeAdvancedMetrics.locationImpact.toFixed(1)}%
  • Current Streak: ${homeAdvancedMetrics.winStreak > 0 ? 'W' + homeAdvancedMetrics.winStreak : 'L' + Math.abs(homeAdvancedMetrics.winStreak)}
- ${game.awayTeamName} (${awayStats?.wins || 0}-${awayStats?.losses || 0}): ${awayFormData.form} form, ${awayStats?.lastTenGames || 'N/A'} in last 10
  • Net Rating: ${awayAdvancedMetrics.netRating}
  • Road Performance: ${awayAdvancedMetrics.locationImpact.toFixed(1)}%
  • Current Streak: ${awayAdvancedMetrics.winStreak > 0 ? 'W' + awayAdvancedMetrics.winStreak : 'L' + Math.abs(awayAdvancedMetrics.winStreak)}
- Head-to-head this season: ${h2hHistory}
${game.sport === 'NBA' ? 
`- Offensive Efficiency: ${homeStats?.offensiveRating?.toFixed(1) || 'N/A'} vs ${awayStats?.offensiveRating?.toFixed(1) || 'N/A'}
- Defensive Efficiency: ${homeStats?.defensiveRating?.toFixed(1) || 'N/A'} vs ${awayStats?.defensiveRating?.toFixed(1) || 'N/A'}
- Pace Impact: ${((homeStats?.pace || 0) - (awayStats?.pace || 0)).toFixed(1)} differential` :
`- Pitching Matchup: ERA ${homeStats?.teamERA?.toFixed(2) || 'N/A'} vs ${awayStats?.teamERA?.toFixed(2) || 'N/A'}
- Run Production: ${homeStats?.avgRunsScored?.toFixed(2) || 'N/A'} vs ${awayStats?.avgRunsScored?.toFixed(2) || 'N/A'} per game
- WHIP Comparison: ${homeStats?.teamWHIP?.toFixed(2) || 'N/A'} vs ${awayStats?.teamWHIP?.toFixed(2) || 'N/A'}`}
Key Factors:
• ${game.homeTeamName}'s ${homeFormData.form} form (${homeAdvancedMetrics.recentMomentum.toFixed(1)} rating)
• ${game.awayTeamName}'s ${awayFormData.form} form (${awayAdvancedMetrics.recentMomentum.toFixed(1)} rating)
• ${Math.abs(homeAdvancedMetrics.locationImpact).toFixed(1)}% home court advantage factor
Overall prediction: ${predictionValue > 0 ? '+' : ''}${predictionValue} spread with ${(confidence * 100).toFixed(1)}% confidence.`;
          break;

        case 'TOTAL':
          predictionValue = game.odds?.total?.overUnder || 0;
          const avgTotalPoints = game.sport === 'NBA' ?
            ((homeStats?.pointsFor || 0) + (awayStats?.pointsFor || 0)) / 2 :
            ((homeStats?.avgRunsScored || 0) + (awayStats?.avgRunsScored || 0)) / 2;
          
          reasoning = `Based on detailed scoring analysis:
Offensive Production:
- ${game.homeTeamName}: ${game.sport === 'NBA' ? homeStats?.pointsFor?.toFixed(1) || 'N/A' : homeStats?.avgRunsScored?.toFixed(1) || 'N/A'} per game
  • Last 10 games trend: ${homeFormData.form}
  • Home scoring: ${((homeStats?.pointsFor || 0) * (homeStats?.homeWinPercentage || 0.5)).toFixed(1)}
- ${game.awayTeamName}: ${game.sport === 'NBA' ? awayStats?.pointsFor?.toFixed(1) || 'N/A' : awayStats?.avgRunsScored?.toFixed(1) || 'N/A'} per game
  • Last 10 games trend: ${awayFormData.form}
  • Road scoring: ${((awayStats?.pointsFor || 0) * (awayStats?.awayWinPercentage || 0.5)).toFixed(1)}

Defensive Metrics:
- ${game.homeTeamName}: ${game.sport === 'NBA' ? homeStats?.pointsAgainst?.toFixed(1) || 'N/A' : homeStats?.avgRunsAllowed?.toFixed(1) || 'N/A'} allowed
- ${game.awayTeamName}: ${game.sport === 'NBA' ? awayStats?.pointsAgainst?.toFixed(1) || 'N/A' : awayStats?.avgRunsAllowed?.toFixed(1) || 'N/A'} allowed

${game.sport === 'NBA' ? 
`Pace Analysis:
• Combined pace: ${(((homeStats?.pace || 0) + (awayStats?.pace || 0)) / 2).toFixed(1)}
• Historical average: ${h2hStats?.averageTotalPoints?.toFixed(1) || 'N/A'} points
• Pace impact on scoring: ${((homeStats?.pace || 0) - 100).toFixed(1)}% vs league average` :
`Pitching/Hitting Matchup:
• Combined ERA: ${(((homeStats?.teamERA || 0) + (awayStats?.teamERA || 0)) / 2).toFixed(2)}
• Combined WHIP: ${(((homeStats?.teamWHIP || 0) + (awayStats?.teamWHIP || 0)) / 2).toFixed(2)}
• Historical scoring: ${h2hStats?.averageRunsScored?.toFixed(1) || 'N/A'} runs per game`}

Key Factors:
• Combined average scoring: ${avgTotalPoints.toFixed(1)} per game
• Recent offensive trends: ${homeFormData.form} vs ${awayFormData.form}
• Matchup history: ${h2hHistory}

Overall prediction: Total of ${predictionValue} with ${(confidence * 100).toFixed(1)}% confidence.`;
          break;

        case 'MONEYLINE':
          predictionValue = game.odds?.moneyline?.homeOdds || -110;
          
          const homeStrengthScore = (
            (homeStats?.winPercentage || 0.5) * 0.3 +
            (homeStats?.homeWinPercentage || 0.5) * 0.3 +
            (homeFormData.score / 10) * 0.4
          ).toFixed(3);

          const awayStrengthScore = (
            (awayStats?.winPercentage || 0.5) * 0.3 +
            (awayStats?.awayWinPercentage || 0.5) * 0.3 +
            (awayFormData.score / 10) * 0.4
          ).toFixed(3);

          console.log(`[PredictionService] Team Strength Scores - ${game.homeTeamName}: ${homeStrengthScore}, ${game.awayTeamName}: ${awayStrengthScore}`);

          reasoning = `Based on comprehensive team analysis:

${game.homeTeamName} Profile:
• Season Record: ${homeStats?.wins || 0}-${homeStats?.losses || 0} (${((homeStats?.wins || 0) / ((homeStats?.wins || 0) + (homeStats?.losses || 1)) * 100).toFixed(1)}%)
• Home Performance: ${homeStats?.homeWinPercentage ? (homeStats.homeWinPercentage * 100).toFixed(1) + '%' : 'N/A'}
• Recent Form: ${homeFormData.form} (${homeStats?.lastTenGames || 'N/A'} in last 10)
• Strength Score: ${homeStrengthScore}

${game.awayTeamName} Profile:
• Season Record: ${awayStats?.wins || 0}-${awayStats?.losses || 0} (${((awayStats?.wins || 0) / ((awayStats?.wins || 0) + (awayStats?.losses || 1)) * 100).toFixed(1)}%)
• Road Performance: ${awayStats?.awayWinPercentage ? (awayStats.awayWinPercentage * 100).toFixed(1) + '%' : 'N/A'}
• Recent Form: ${awayFormData.form} (${awayStats?.lastTenGames || 'N/A'} in last 10)
• Strength Score: ${awayStrengthScore}

Head-to-Head Analysis:
• Historical Record: ${h2hHistory}
• Last Meeting: ${h2hStats?.lastMeetingResult || 'N/A'}

${game.sport === 'NBA' ? 
`Performance Metrics:
• Net Rating Differential: ${(Number(homeAdvancedMetrics.netRating) - Number(awayAdvancedMetrics.netRating)).toFixed(1)}
• Momentum Factor: ${(homeAdvancedMetrics.recentMomentum - awayAdvancedMetrics.recentMomentum).toFixed(1)}` :
`Key Statistics:
• ERA Differential: ${((homeStats?.teamERA || 0) - (awayStats?.teamERA || 0)).toFixed(2)}
• Run Differential: ${((homeStats?.avgRunsScored || 0) - (homeStats?.avgRunsAllowed || 0)).toFixed(1)} vs ${((awayStats?.avgRunsScored || 0) - (awayStats?.avgRunsAllowed || 0)).toFixed(1)}`}

Key Factors:
• Home/Away Impact: ${homeAdvancedMetrics.locationImpact.toFixed(1)}% advantage
• Form Differential: ${(homeFormData.score - awayFormData.score).toFixed(1)}
• Streak Impact: Home ${homeAdvancedMetrics.winStreak > 0 ? 'W' + homeAdvancedMetrics.winStreak : 'L' + Math.abs(homeAdvancedMetrics.winStreak)} vs Away ${awayAdvancedMetrics.winStreak > 0 ? 'W' + awayAdvancedMetrics.winStreak : 'L' + Math.abs(awayAdvancedMetrics.winStreak)}

Overall prediction: ${game.homeTeamName} ${predictionValue > 0 ? '+' : ''}${predictionValue} with ${(confidence * 100).toFixed(1)}% confidence.`;
          break;
      }

      // Enhanced confidence calculation
      if (homeStats && awayStats) {
        const baseConfidence = 0.60 + (Math.random() * 0.20); // Reduced randomness
        
        // Record-based factors
        const homeWinPct = homeStats.wins / (homeStats.wins + homeStats.losses || 1);
        const awayWinPct = awayStats.wins / (awayStats.wins + awayStats.losses || 1);
        const recordFactor = Math.abs(homeWinPct - awayWinPct);
        
        // Form and momentum factors
        const formDiff = homeFormData.score - awayFormData.score;
        const momentumDiff = homeAdvancedMetrics.recentMomentum - awayAdvancedMetrics.recentMomentum;
        
        // Location impact
        const locationImpact = (homeAdvancedMetrics.locationImpact - awayAdvancedMetrics.locationImpact) * 0.002;
        
        // Efficiency differential
        const efficiencyDiff = Number(homeAdvancedMetrics.efficiency) - Number(awayAdvancedMetrics.efficiency);
        
        // Sport-specific adjustments
        const sportSpecificImpact = game.sport === 'NBA' ?
          (Number(homeAdvancedMetrics.netRating) - Number(awayAdvancedMetrics.netRating)) * 0.01 :
          (homeFormData.matchupAdvantage - awayFormData.matchupAdvantage) * 0.02;
        
        // Calculate weighted confidence
        let adjustedConfidence = baseConfidence;
        adjustedConfidence += recordFactor * 0.15;     // 15% weight to record difference
        adjustedConfidence += (formDiff / 10) * 0.20;  // 20% weight to form difference
        adjustedConfidence += (momentumDiff / 10) * 0.15; // 15% weight to momentum
        adjustedConfidence += locationImpact * 0.20;   // 20% weight to location impact
        adjustedConfidence += efficiencyDiff * 0.15;   // 15% weight to efficiency
        adjustedConfidence += sportSpecificImpact * 0.15; // 15% weight to sport-specific factors
        
        // Add head-to-head impact if available
        if (h2hStats && h2hStats.totalGames > 0) {
          const h2hWinPct = h2hStats.homeTeamWins / h2hStats.totalGames;
          const h2hFactor = Math.abs(h2hWinPct - 0.5) * 2;
          const recentH2hImpact = h2hStats.lastMeetingResult.includes(game.homeTeamName) ? 0.05 : -0.05;
          
          adjustedConfidence += h2hFactor * 0.10;      // 10% weight to h2h history
          adjustedConfidence += recentH2hImpact * 0.05; // 5% weight to recent h2h result
        }
        
        // Ensure confidence stays within bounds and apply diminishing returns
        confidence = Math.min(0.90, Math.max(0.60, adjustedConfidence));
        
        // Log detailed confidence breakdown
        console.log(`[PredictionService] Enhanced confidence calculation for ${type}:`, {
          baseConfidence: baseConfidence.toFixed(3),
          recordImpact: (recordFactor * 0.15).toFixed(3),
          formImpact: ((formDiff / 10) * 0.20).toFixed(3),
          momentumImpact: ((momentumDiff / 10) * 0.15).toFixed(3),
          locationImpact: (locationImpact * 0.20).toFixed(3),
          efficiencyImpact: (efficiencyDiff * 0.15).toFixed(3),
          sportSpecificImpact: (sportSpecificImpact * 0.15).toFixed(3),
          finalConfidence: confidence.toFixed(3)
        });
      }

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

      console.log(`[PredictionService] Generated ${type} prediction:`, {
        gameId,
        type,
        value: predictionValue,
        confidence: (confidence * 100).toFixed(1) + '%',
        grade: prediction.grade,
        homeStrength: homeFormData.score.toFixed(2),
        awayStrength: awayFormData.score.toFixed(2),
        netRatingDiff: game.sport === 'NBA' ? 
          (Number(homeAdvancedMetrics.netRating) - Number(awayAdvancedMetrics.netRating)).toFixed(2) :
          ((homeStats?.teamERA || 0) - (awayStats?.teamERA || 0)).toFixed(2)
      });
      
      return prediction;
    } catch (error) {
      console.error(`[PredictionService] Error generating prediction for game ${game.id}:`, error);
      throw error;
    }
  }

  // Enhanced grade calculation with more granular grades
  private static calculateGrade(confidence: number): string {
    // Convert to percentage if in decimal form
    const confidencePercent = confidence > 1 ? confidence : confidence * 100;
    
    if (confidencePercent >= 90) return 'A+';
    if (confidencePercent >= 85) return 'A';
    if (confidencePercent >= 80) return 'A-';
    if (confidencePercent >= 75) return 'B+';
    if (confidencePercent >= 70) return 'B';
    if (confidencePercent >= 65) return 'B-';
    if (confidencePercent >= 60) return 'C+';
    return 'C';
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

      // Enhanced team stats logging
      const homeTeamStats = {
        record: homeStats ? `${homeStats.wins}-${homeStats.losses}` : 'N/A',
        lastTen: homeStats?.lastTenGames || 'N/A',
        winPct: homeStats ? (homeStats.winPercentage * 100).toFixed(1) + '%' : 'N/A',
        homeWinPct: homeStats?.homeWinPercentage ? (homeStats.homeWinPercentage * 100).toFixed(1) + '%' : 'N/A',
        streak: homeStats?.streak || 0,
        ...(game.sport === 'NBA' ? {
          offRating: homeStats?.offensiveRating?.toFixed(1) || 'N/A',
          defRating: homeStats?.defensiveRating?.toFixed(1) || 'N/A',
          pace: homeStats?.pace?.toFixed(1) || 'N/A',
          netRating: homeStats ? 
            ((homeStats.offensiveRating || 0) - (homeStats.defensiveRating || 0)).toFixed(1) : 'N/A'
        } : {
          era: homeStats?.teamERA?.toFixed(2) || 'N/A',
          whip: homeStats?.teamWHIP?.toFixed(2) || 'N/A',
          runsPerGame: homeStats?.avgRunsScored?.toFixed(2) || 'N/A',
          runDiff: homeStats ? 
            ((homeStats.runsScored || 0) - (homeStats.runsAllowed || 0)).toFixed(1) : 'N/A'
        })
      };

      const awayTeamStats = {
        record: awayStats ? `${awayStats.wins}-${awayStats.losses}` : 'N/A',
        lastTen: awayStats?.lastTenGames || 'N/A',
        winPct: awayStats ? (awayStats.winPercentage * 100).toFixed(1) + '%' : 'N/A',
        awayWinPct: awayStats?.awayWinPercentage ? (awayStats.awayWinPercentage * 100).toFixed(1) + '%' : 'N/A',
        streak: awayStats?.streak || 0,
        ...(game.sport === 'NBA' ? {
          offRating: awayStats?.offensiveRating?.toFixed(1) || 'N/A',
          defRating: awayStats?.defensiveRating?.toFixed(1) || 'N/A',
          pace: awayStats?.pace?.toFixed(1) || 'N/A',
          netRating: awayStats ? 
            ((awayStats.offensiveRating || 0) - (awayStats.defensiveRating || 0)).toFixed(1) : 'N/A'
        } : {
          era: awayStats?.teamERA?.toFixed(2) || 'N/A',
          whip: awayStats?.teamWHIP?.toFixed(2) || 'N/A',
          runsPerGame: awayStats?.avgRunsScored?.toFixed(2) || 'N/A',
          runDiff: awayStats ? 
            ((awayStats.runsScored || 0) - (awayStats.runsAllowed || 0)).toFixed(1) : 'N/A'
        })
      };

      console.log(`[PredictionService] Home team (${game.homeTeamName}) detailed stats:`, homeTeamStats);
      console.log(`[PredictionService] Away team (${game.awayTeamName}) detailed stats:`, awayTeamStats);

      if (h2hStats) {
        const h2hDetails = {
          record: `${h2hStats.homeTeamWins}-${h2hStats.awayTeamWins}`,
          totalGames: h2hStats.totalGames,
          lastMeeting: h2hStats.lastMeetingDate,
          result: h2hStats.lastMeetingResult,
          homeWinPct: h2hStats.totalGames > 0 ? 
            ((h2hStats.homeTeamWins / h2hStats.totalGames) * 100).toFixed(1) + '%' : 'N/A',
          ...(game.sport === 'NBA' ? {
            avgPoints: h2hStats.averageTotalPoints || 'N/A',
            avgDiff: h2hStats.averagePointsDiff || 'N/A',
            totalPointsTrend: h2hStats.averageTotalPoints ? 
              (h2hStats.averageTotalPoints > 200 ? 'High scoring' : 'Low scoring') : 'N/A'
          } : {
            avgRuns: h2hStats.averageRunsScored || 'N/A',
            avgDiff: h2hStats.averageRunsDiff || 'N/A',
            scoringTrend: h2hStats.averageRunsScored ?
              (h2hStats.averageRunsScored > 8 ? 'High scoring' : 'Low scoring') : 'N/A'
          })
        };
        console.log(`[PredictionService] Detailed head-to-head analysis:`, h2hDetails);
      }

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
            
            confidence += recordFactor * 0.15; // Increased weight for record difference
            confidence += recentFormFactor * 0.15; // Increased weight for recent form
            confidence += streakImpact; // New factor for win/loss streaks
            confidence += homeAdvantage; // New factor for home court advantage

            // Sport-specific confidence adjustments
            if (game.sport === 'NBA') {
              const netRatingDiff = ((homeStats.offensiveRating || 0) - (homeStats.defensiveRating || 0)) -
                                  ((awayStats.offensiveRating || 0) - (awayStats.defensiveRating || 0));
              confidence += (netRatingDiff / 10) * 0.05;
            } else {
              const eraDiff = (awayStats.teamERA || 0) - (homeStats.teamERA || 0);
              confidence += (eraDiff / 5) * 0.05;
            }

            console.log(`[PredictionService] Detailed ${type} confidence calculation:`, {
              baseConfidence: (0.60 + (Math.random() * 0.30)).toFixed(3),
              recordImpact: (recordFactor * 0.15).toFixed(3),
              formImpact: (recentFormFactor * 0.15).toFixed(3),
              streakImpact: streakImpact.toFixed(3),
              homeAdvantage: homeAdvantage.toFixed(3),
              sportSpecificImpact: game.sport === 'NBA' ? 
                ((((homeStats.offensiveRating || 0) - (homeStats.defensiveRating || 0)) -
                  ((awayStats.offensiveRating || 0) - (awayStats.defensiveRating || 0))) / 10 * 0.05).toFixed(3) :
                (((awayStats.teamERA || 0) - (homeStats.teamERA || 0)) / 5 * 0.05).toFixed(3),
              subtotal: confidence.toFixed(3)
            });
          }
          
          if (h2hStats && h2hStats.totalGames > 0) {
            const h2hWinPct = h2hStats.homeTeamWins / h2hStats.totalGames;
            const h2hFactor = Math.abs(h2hWinPct - 0.5) * 2;
            const recentH2hImpact = h2hStats.lastMeetingResult.includes(game.homeTeamName) ? 0.05 : -0.05;
            
            confidence += h2hFactor * 0.15; // Increased weight for head-to-head history
            confidence += recentH2hImpact; // New factor for most recent meeting result

            console.log(`[PredictionService] H2H impact on ${type}:`, {
              h2hWinPct: h2hWinPct.toFixed(3),
              h2hImpact: (h2hFactor * 0.15).toFixed(3),
              recentH2hImpact: recentH2hImpact.toFixed(3),
              finalConfidence: Math.min(0.90, confidence).toFixed(3)
            });
          }
          
          confidence = Math.min(0.90, confidence);
          
          return this.generatePrediction(game.id, type, game, homeStats, awayStats, h2hStats, confidence);
        })
      );

      console.log(`[PredictionService] Generated ${predictions.length} predictions for ${game.homeTeamName} vs ${game.awayTeamName}`);
      return predictions;
    } catch (error) {
      console.error(`[PredictionService] Error generating predictions for game ${game.id}:`, error);
      return [];
    }
  }

  private static safeParseInt(value: any): number {
    if (typeof value === 'string') {
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  }

  private static calculateHomeWinPercentage(stats: any): number {
    if (!stats) return 0;
    const homeWins = this.safeParseInt(stats.homeWins);
    const homeLosses = this.safeParseInt(stats.homeLosses);
    const homeGames = homeWins + homeLosses;
    if (homeGames === 0) return 0;
    return Math.min(1, Math.max(0, homeWins / homeGames));
  }

  private static calculateAwayWinPercentage(stats: any): number {
    if (!stats) return 0;
    const awayWins = this.safeParseInt(stats.awayWins);
    const awayLosses = this.safeParseInt(stats.awayLosses);
    const awayGames = awayWins + awayLosses;
    if (awayGames === 0) return 0;
    return Math.min(1, Math.max(0, awayWins / awayGames));
  }
}