import { Game, PredictionType, SportType, Prediction } from '../models/types';
import { ApiManager } from './apiManager';
import { PredictorModel, EnhancedFactors } from './enhanced-predictions/predictorModel';
import { MLBStatsService, PitcherStats, PitcherDetails } from './mlbStatsApi';

// Keep TeamStats and H2HStats interfaces (defined in stats API files now, maybe remove duplication later)
export interface TeamStats {
  wins: number; losses: number; homeWins: number; homeLosses: number;
  awayWins: number; awayLosses: number; lastTenWins: number;
  avgRunsScored?: number; avgRunsAllowed?: number;
  avgPointsScored?: number; avgPointsAllowed?: number;
  // Add MLB Team Pitching Stats
  teamERA?: number;
  teamWHIP?: number;
  // Add MLB Batting Splits vs LHP/RHP
  avgVsLHP?: number;
  opsVsLHP?: number;
  avgVsRHP?: number;
  opsVsRHP?: number;
  // Add NBA Advanced Stats
  pace?: number; // Possessions per 48 minutes
  offensiveRating?: number; // Points scored per 100 possessions
  defensiveRating?: number; // Points allowed per 100 possessions
}

export interface H2HStats {
  totalGames: number; homeTeamWins: number; awayTeamWins: number;
  averageRunsDiff?: number; averagePointsDiff?: number;
}

// Prediction Factors - weights might need adjustment based on sport
interface PredictionFactors {
  overallRecord: number; // Home Win % - Away Win %
  homeAwaySplit: number; // Home Team Home Win % - Away Team Away Win %
  recentForm: number;    // Home Last 10 Win % - Away Last 10 Win %
  headToHead: number;    // Normalized H2H Win % for Home Team
  scoringDiff: number;   // Normalized Scoring Differential (Points/Runs)
  // Combined factor for starting pitcher matchup
  startingPitcherMatchup?: number; 
  teamPitchingFactor?: number; // NEW: Factor for overall team pitching comparison
  batterHandednessFactor?: number; // NEW: Factor for batting splits vs pitcher hand
  // NBA Specific
  paceFactor?: number; // NEW: Factor for game pace difference
  efficiencyFactor?: number; // NEW: Factor for Net Rating difference
}

// --- Constants --- 
// Example Park Factors (Run Scoring Index relative to 1.00 average)
// Source: Representative values, use real data in production!
const MLB_PARK_FACTORS: Record<string, number> = {
    // Hitter Friendly
    'Colorado Rockies': 1.15, 
    'Cincinnati Reds': 1.08,
    'Boston Red Sox': 1.06, // Fenway
    'Texas Rangers': 1.05,
    // Pitcher Friendly
    'San Diego Padres': 0.92,
    'Seattle Mariners': 0.93,
    'Oakland Athletics': 0.94,
    'Miami Marlins': 0.95,
    'San Francisco Giants': 0.95,
    // Add other teams... default to 1.00 if not listed
};

export class PredictionService {
  // No longer static - needs instantiation?
  // For now, keep methods static for simplicity as they don't hold state

  // --- Factor Calculation Weights (Example - NEEDS TUNING) ---
  private static getWeights(sport: SportType) {
      if (sport === 'NBA') {
          // Adjusted Weights: Removed scoringDiff, increased efficiency, added small pace weight
          return { 
              overallRecord: 0.15, 
              homeAwaySplit: 0.20, // Slightly increased
              recentForm: 0.20,    // Slightly increased
              headToHead: 0.05,    // Kept low
              scoringDiff: 0,      // Removed (weight set to 0)
              paceFactor: 0.05,      // Small weight for win%
              efficiencyFactor: 0.35 // Increased slightly (Total = 1.00)
          }; 
      } else { // MLB - Rebalanced weights
          return { 
              overallRecord: 0.10, // Reduced
              homeAwaySplit: 0.15, // Kept
              recentForm: 0.15,    // Increased
              headToHead: 0.05,    // Reduced 
              scoringDiff: 0.10,   // Kept (Runs diff still relevant)
              startingPitcherERA: 0.15, 
              startingPitcherWHIP: 0.10, 
              teamPitchingFactor: 0.10, // Reduced slightly
              batterHandednessFactor: 0.10 // Kept
              // Total = 1.00
          };
      }
  }

  // --- Helper: Calculate Win Percentage --- 
  private static calculateWinPct(wins: number | undefined, losses: number | undefined): number {
    const w = wins ?? 0;
    const l = losses ?? 0;
    const total = w + l;
    return total > 0 ? w / total : 0.5; // Default to 0.5 if no games
  }

  // --- Calculate Prediction Factors based on fetched stats --- 
  private static calculateFactors(
    sport: SportType,
    homeStats: TeamStats | null,
    awayStats: TeamStats | null,
    h2hStats: H2HStats | null,
    homePitcherStats?: PitcherStats | null,
    awayPitcherStats?: PitcherStats | null,
    homePitcherHand?: 'L' | 'R' | null, // NEW: Add pitcher hands
    awayPitcherHand?: 'L' | 'R' | null
  ): PredictionFactors {
      // Default values if stats are missing
      const hs = homeStats ?? { wins: 0, losses: 0, homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0, lastTenWins: 0 };
      const as = awayStats ?? { wins: 0, losses: 0, homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0, lastTenWins: 0 };
      const h2h = h2hStats ?? { totalGames: 0, homeTeamWins: 0, awayTeamWins: 0 };

      const overallRecord = this.calculateWinPct(hs.wins, hs.losses) - this.calculateWinPct(as.wins, as.losses);
      const homeAwaySplit = this.calculateWinPct(hs.homeWins, hs.homeLosses) - this.calculateWinPct(as.awayWins, as.awayLosses);
      // Calculate last ten losses explicitly
      const homeLastTenLosses = 10 - (hs.lastTenWins ?? 0);
      const awayLastTenLosses = 10 - (as.lastTenWins ?? 0);
      // Explicitly cast results and use ClassName.staticMethod to satisfy linter
      const homeRecentPct = Number(PredictionService.calculateWinPct(hs.lastTenWins, homeLastTenLosses)); 
      const awayRecentPct = Number(PredictionService.calculateWinPct(as.lastTenWins, awayLastTenLosses));
      const recentForm = homeRecentPct - awayRecentPct;
      const headToHead = h2h.totalGames > 0 ? (PredictionService.calculateWinPct(h2h.homeTeamWins, h2h.awayTeamWins) - 0.5) * 2 : 0; 
      
      let scoringDiff = 0;
      if (sport === 'NBA' && hs.avgPointsScored !== undefined && hs.avgPointsAllowed !== undefined && as.avgPointsScored !== undefined && as.avgPointsAllowed !== undefined) {
          const homeNet = hs.avgPointsScored - hs.avgPointsAllowed;
          const awayNet = as.avgPointsScored - as.avgPointsAllowed;
          scoringDiff = (homeNet - awayNet) / 20; // Normalize (e.g., divide by ~20 point swing)
      } else if (sport === 'MLB' && hs.avgRunsScored !== undefined && hs.avgRunsAllowed !== undefined && as.avgRunsScored !== undefined && as.avgRunsAllowed !== undefined) {
          const homeNet = hs.avgRunsScored - hs.avgRunsAllowed;
          const awayNet = as.avgRunsScored - as.avgRunsAllowed;
          scoringDiff = (homeNet - awayNet) / 2; // Normalize (e.g., divide by ~2 run swing)
      }

      // Calculate MLB Pitcher Factors (ERA and WHIP)
      let startingPitcherERA_Factor = 0;
      let startingPitcherWHIP_Factor = 0;
      if (sport === 'MLB' && homePitcherStats && awayPitcherStats) {
          // ERA Factor (Lower is better)
          if (homePitcherStats.era !== undefined && awayPitcherStats.era !== undefined) {
            const homeERA = parseFloat(homePitcherStats.era);
            const awayERA = parseFloat(awayPitcherStats.era);
            if (!isNaN(homeERA) && !isNaN(awayERA)) {
              const eraDiff = awayERA - homeERA; // Positive favors home pitcher
              startingPitcherERA_Factor = eraDiff / 2.0; // Normalize (e.g., 2 ERA diff = factor of 1)
            }
          }
          // WHIP Factor (Lower is better)
          if (homePitcherStats.whip !== undefined && awayPitcherStats.whip !== undefined) {
            const homeWHIP = parseFloat(homePitcherStats.whip);
            const awayWHIP = parseFloat(awayPitcherStats.whip);
            if (!isNaN(homeWHIP) && !isNaN(awayWHIP)) {
              const whipDiff = awayWHIP - homeWHIP; // Positive favors home pitcher
              startingPitcherWHIP_Factor = whipDiff / 0.2; // Normalize (e.g., 0.2 WHIP diff = factor of 1)
            }
          }
      }
      
      // Combine weighted pitcher factors into single matchup factor if MLB
      let combinedPitcherFactor: number | undefined = undefined;
      if (sport === 'MLB') {
          const weights = this.getWeights(sport);
          combinedPitcherFactor = (startingPitcherERA_Factor * (weights.startingPitcherERA ?? 0)) + 
                                (startingPitcherWHIP_Factor * (weights.startingPitcherWHIP ?? 0));
      }

      // --- NEW: Calculate Team Pitching Factor (MLB only) --- 
      let teamPitchingFactor: number | undefined = undefined;
      if (sport === 'MLB' && hs.teamERA && hs.teamWHIP && as.teamERA && as.teamWHIP) {
          // Compare ERA (lower is better -> away - home favors home)
          const teamEraDiff = (as.teamERA - hs.teamERA) / 2.0; // Normalize: 2 ERA diff = factor 1
          // Compare WHIP (lower is better -> away - home favors home)
          const teamWhipDiff = (as.teamWHIP - hs.teamWHIP) / 0.2; // Normalize: 0.2 WHIP diff = factor 1
          // Simple combination (could be weighted differently)
          teamPitchingFactor = (teamEraDiff * 0.5) + (teamWhipDiff * 0.5); 
          // Clamp factor absolute value to avoid extremes? e.g., max +/- 1.5
          teamPitchingFactor = Math.max(-1.5, Math.min(1.5, teamPitchingFactor));
      }

      // --- NEW: Calculate Batter vs Pitcher Handedness Factor (MLB only) --- 
      let batterHandednessFactor: number | undefined = undefined;
      if (sport === 'MLB' && homePitcherHand && awayPitcherHand && 
          hs.opsVsLHP && hs.opsVsRHP && as.opsVsLHP && as.opsVsRHP) 
      {
          const homeOPS_vs_AwayPitcher = awayPitcherHand === 'L' ? hs.opsVsLHP : hs.opsVsRHP;
          const awayOPS_vs_HomePitcher = homePitcherHand === 'L' ? as.opsVsLHP : as.opsVsRHP;
          
          // Compare OPS difference (higher is better)
          const opsDiff = homeOPS_vs_AwayPitcher - awayOPS_vs_HomePitcher;
          
          // Normalize (e.g., an OPS diff of .100 might be significant)
          batterHandednessFactor = opsDiff / 0.100; 
          
          // Clamp factor
          batterHandednessFactor = Math.max(-1.5, Math.min(1.5, batterHandednessFactor));
      }

      // --- NBA Specific Factors --- 
      let paceFactor: number | undefined = undefined;
      let efficiencyFactor: number | undefined = undefined;
      if (sport === 'NBA' && hs.pace && as.pace && hs.offensiveRating && hs.defensiveRating && as.offensiveRating && as.defensiveRating) {
          // Pace Factor: Compare combined pace to a league average (if known) or just relative difference?
          // Simple approach: Higher pace suggests higher score potential. Factor pushes towards Over.
          // Average pace is roughly 100. Let's center the factor around that.
          const avgPace = (hs.pace + as.pace) / 2;
          paceFactor = (avgPace - 100) / 5; // Normalize: 5 possessions deviation = factor of 1
          paceFactor = Math.max(-1.5, Math.min(1.5, paceFactor)); // Clamp
          
          // Efficiency Factor: Compare Net Ratings (OffRtg - DefRtg)
          // Lower DefRtg is better.
          const homeNetRating = hs.offensiveRating - hs.defensiveRating;
          const awayNetRating = as.offensiveRating - as.defensiveRating;
          const netRatingDiff = homeNetRating - awayNetRating;
          
          // Normalize (e.g., a 10 point Net Rating difference is significant)
          efficiencyFactor = netRatingDiff / 10.0; 
          // Clamp factor
          efficiencyFactor = Math.max(-2.0, Math.min(2.0, efficiencyFactor)); // Allow larger swing for efficiency
      }

      return {
          overallRecord: isNaN(overallRecord) ? 0 : overallRecord,
          homeAwaySplit: isNaN(homeAwaySplit) ? 0 : homeAwaySplit,
          recentForm: isNaN(recentForm) ? 0 : recentForm,
          headToHead: isNaN(headToHead) ? 0 : headToHead,
          scoringDiff: isNaN(scoringDiff) ? 0 : scoringDiff,
          // Use the combined weighted factor
          startingPitcherMatchup: combinedPitcherFactor, 
          teamPitchingFactor: teamPitchingFactor,
          batterHandednessFactor: batterHandednessFactor,
          // NBA
          paceFactor: paceFactor, 
          efficiencyFactor: efficiencyFactor
      };
  }

  // --- Calculate Confidence (0-100) based on weighted factors --- 
  private static calculateConfidenceValue(sport: SportType, factors: PredictionFactors): number {
      const weights = this.getWeights(sport);
      let rawConfidence = 0.5; 
      
      // Common Factors (apply based on weight)
      rawConfidence += (factors.overallRecord ?? 0) * (weights.overallRecord ?? 0);
      rawConfidence += (factors.homeAwaySplit ?? 0) * (weights.homeAwaySplit ?? 0);
      rawConfidence += (factors.recentForm ?? 0) * (weights.recentForm ?? 0);
      rawConfidence += (factors.headToHead ?? 0) * (weights.headToHead ?? 0);
      // Note: scoringDiff weight is 0 for NBA, so it has no effect there
      rawConfidence += (factors.scoringDiff ?? 0) * (weights.scoringDiff ?? 0);
      
      if (sport === 'MLB') {
          // Add combined starting pitcher factor (already weighted in calculateFactors)
          rawConfidence += (factors.startingPitcherMatchup ?? 0);
          // Add weighted team pitching factor
          rawConfidence += (factors.teamPitchingFactor ?? 0) * (weights.teamPitchingFactor ?? 0); 
          rawConfidence += (factors.batterHandednessFactor ?? 0) * (weights.batterHandednessFactor ?? 0); // Add weighted handedness factor
      } else if (sport === 'NBA') {
          // Add weighted NBA factors
          rawConfidence += (factors.paceFactor ?? 0) * (weights.paceFactor ?? 0); // Add small pace influence
          rawConfidence += (factors.efficiencyFactor ?? 0) * (weights.efficiencyFactor ?? 0);
      }

      const clampedConfidence = Math.max(0.05, Math.min(0.95, rawConfidence)); 
      return Math.round(clampedConfidence * 100);
  }

  // --- Determine Grade from Confidence --- 
  private static getGrade(confidence: number): string {
    // Adjusted thresholds for 0-100 scale
    if (confidence >= 80) return 'A';
    if (confidence >= 70) return 'B';
    if (confidence >= 60) return 'C';
    if (confidence >= 50) return 'D'; // Added D grade
    return 'F'; // Added F grade for below 50
  }

  // --- Decide Pick based on factors/confidence (Basic Example) ---
  private static decidePickAndFormat(game: Game, type: PredictionType, factors: PredictionFactors, confidence: number): { pick: string, oddsValue: number | string, line?: number, formattedValue: string } | null {
      let chosenPick: any = null; // Use 'any' temporarily or define a better shared type
      const homeFavoredByFactors = confidence > 50; 
      const formatOdds = (odds: number | string): string => (typeof odds === 'string' ? odds : (odds > 0 ? `+${odds}` : `${odds}`));

      try {
          switch (type) {
              case 'SPREAD':
                  if (!game.odds?.spread?.homeSpread || !game.odds?.spread?.awaySpread || !game.odds?.spread?.homeOdds || !game.odds?.spread?.awayOdds) {
                      console.warn(`[PredictionService] Missing spread odds for game ${game.id}`);
                      return null;
                  }

                  const spreadPick = homeFavoredByFactors ? 
                      { line: game.odds.spread.homeSpread, odds: game.odds.spread.homeOdds, team: game.homeTeamName } : 
                      { line: game.odds.spread.awaySpread, odds: game.odds.spread.awayOdds, team: game.awayTeamName };

                  chosenPick = {
                      pick: `${spreadPick.team} ${spreadPick.line > 0 ? '+' : ''}${spreadPick.line}`,
                      oddsValue: spreadPick.odds,
                      line: spreadPick.line,
                      predictionType: type // Add type here
                  };
                  break;
              case 'MONEYLINE':
                  if (game.odds?.moneyline?.homeOdds === undefined || game.odds?.moneyline?.awayOdds === undefined) {
                      console.warn(`[PredictionService] Missing moneyline odds for game ${game.id}`);
                      return null;
                  }

                  const mlPick = homeFavoredByFactors ? 
                      { odds: game.odds.moneyline.homeOdds, team: game.homeTeamName } : 
                      { odds: game.odds.moneyline.awayOdds, team: game.awayTeamName };

                  chosenPick = {
                      pick: mlPick.team,
                      oddsValue: mlPick.odds,
                      predictionType: type // Add type here
                  };
                  break;
              case 'TOTAL':
                  if (game.odds?.total?.overUnder === undefined || game.odds?.total?.overOdds === undefined || game.odds?.total?.underOdds === undefined) {
                      console.warn(`[PredictionService] Missing total odds for game ${game.id}`);
                      return null;
                  }

                  const totalLine = game.odds.total.overUnder;
                  // Adjust scoring diff by park factor if MLB
                  let totalLeanFactor = 0;
                  if (game.sport === 'MLB') {
                      const parkFactor = MLB_PARK_FACTORS[game.homeTeamName] ?? 1.00;
                      const parkAdjustment = (parkFactor - 1.00) * 2.0;
                      totalLeanFactor += parkAdjustment;
                  }

                  // Predict Over/Under based on adjusted scoring diff vs. line
                  const predictedScore = factors.scoringDiff ?? 0 + totalLine;
                  totalLeanFactor += predictedScore - totalLine;

                  const totalPick = totalLeanFactor > 0 ? 
                      { pick: 'Over', line: totalLine, odds: game.odds.total.overOdds } : 
                      { pick: 'Under', line: totalLine, odds: game.odds.total.underOdds };

                  chosenPick = {
                      pick: `${totalPick.pick} ${totalPick.line}`,
                      oddsValue: totalPick.odds,
                      line: totalPick.line,
                      predictionType: type // Add type here
                  };
                  break;
              default: return null;
          }
          
          // Format the value string
          let formattedValue = 'N/A';
          if (chosenPick) {
              const oddsStr = formatOdds(chosenPick.oddsValue);
              if (type === 'SPREAD' || type === 'TOTAL') {
                  formattedValue = `${chosenPick.pick} (${oddsStr})`;
              } else { // Moneyline
                  formattedValue = `${chosenPick.pick} ${oddsStr}`;
              }
          }
          // Return chosenPick along with formattedValue, remove redundant type add here
          return chosenPick ? { ...chosenPick, formattedValue } : null;

      } catch (e) {
          console.error(`[PredictionService] Error deciding pick for ${game.id} - ${type}:`, e);
          return null;
      }
  }

  // --- Generate Reasoning (Basic Example) ---
  private static generateReasoningText(game: Game, factors: PredictionFactors, pickDetails: any): string {
      let reasoning: string; // Declare reasoning at the top
      let strongestFactor = 'overall record';
      const weights = this.getWeights(game.sport);
      let maxFactorAbs = Math.abs((factors.overallRecord ?? 0) * (weights.overallRecord ?? 0)); 

      const checkFactor = (factorName: keyof PredictionFactors, factorLabel: string, weight: number | undefined) => {
        const factorValue = factors[factorName];
        if (factorValue !== undefined && weight !== undefined) {
            const weightedFactorAbs = Math.abs(factorValue * weight);
            if (weightedFactorAbs > maxFactorAbs) {
              strongestFactor = factorLabel;
              maxFactorAbs = weightedFactorAbs;
            }
        }
      };

      // Check common factors
      checkFactor('homeAwaySplit', 'home/away split', weights.homeAwaySplit);
      checkFactor('recentForm', 'recent form', weights.recentForm);
      checkFactor('headToHead', 'head-to-head', weights.headToHead);
      checkFactor('scoringDiff', 'scoring differential', weights.scoringDiff);
      
      if (game.sport === 'MLB') {
          // Check MLB specific factors
          // For combined factors like startingPitcherMatchup (already weighted), check absolute value directly
          if (factors.startingPitcherMatchup !== undefined) {
              if (Math.abs(factors.startingPitcherMatchup) > maxFactorAbs) {
                 strongestFactor = 'starting pitcher matchup';
                 maxFactorAbs = Math.abs(factors.startingPitcherMatchup);
              }
          }
          checkFactor('teamPitchingFactor', 'overall team pitching', weights.teamPitchingFactor);
          checkFactor('batterHandednessFactor', 'batter vs pitcher handedness', weights.batterHandednessFactor);
      } else if (game.sport === 'NBA') {
          // Check NBA specific factors
          // checkFactor('paceFactor', 'game pace', weights.paceFactor); // Pace mainly affects TOTAL, maybe don't weight it for win%
          checkFactor('efficiencyFactor', 'team efficiency rating', weights.efficiencyFactor);
      }

      // Assign initial reasoning string
      reasoning = `Prediction leans towards ${pickDetails.pick} primarily based on ${strongestFactor}. `;
      
      // Add sport-specific details
      if (game.sport === 'MLB') {
           if (factors.startingPitcherMatchup !== undefined) {
             reasoning += `Starting pitcher matchup (ERA/WHIP) considered. `;
           }
           if (factors.teamPitchingFactor !== undefined) {
               reasoning += `Overall team pitching performance considered. `;
           }
           if (factors.batterHandednessFactor !== undefined) {
               reasoning += `Team batting splits vs pitcher handedness considered. `;
           }
           // Add Park Factor reasoning for TOTALS *after* initial assignment
           if (pickDetails.predictionType === 'TOTAL') {
               const parkFactor = MLB_PARK_FACTORS[game.homeTeamName] ?? 1.00;
               if (parkFactor > 1.02) reasoning += `Ballpark factors favoring hitters considered. `;
               if (parkFactor < 0.98) reasoning += `Ballpark factors favoring pitchers considered. `;
           }
      } else if (game.sport === 'NBA') {
           if (factors.efficiencyFactor !== undefined) {
               reasoning += `Team efficiency (Net Rating) matchup considered. `;
           }
           if (pickDetails.predictionType === 'TOTAL' && factors.paceFactor !== undefined) {
                reasoning += `Projected game pace was a factor in the total. `;
           }
      }
      reasoning += `Model confidence reflects analysis of various factors.`
      return reasoning;
  }

  // --- Public Method: Get Predictions for a Game --- 
  public static async getPredictionsForGame(
    game: Game,
    homeStats: TeamStats | null,
    awayStats: TeamStats | null,
    h2hStats: H2HStats | null
  ): Promise<Prediction[]> {
    if (!homeStats || !awayStats) {
      console.error(`[PredictionService] Missing required team stats for game ${game.id}. Cannot generate predictions.`);
      return [];
    }

    // MLB-specific data collection for pitcher matchups
    let homePitcherDetails: PitcherDetails | null = null;
    let awayPitcherDetails: PitcherDetails | null = null;
    
    if (game.sport === 'MLB' && game.probableHomePitcherId && game.probableAwayPitcherId) {
      try {
        [homePitcherDetails, awayPitcherDetails] = await Promise.all([
          MLBStatsService.getPitcherDetails(game.probableHomePitcherId),
          MLBStatsService.getPitcherDetails(game.probableAwayPitcherId)
        ]);
      } catch (error) {
        console.warn(`[PredictionService] Error fetching pitcher details: ${error}`);
      }
    }

    // Calculate enhanced factors using PredictorModel
    const factors = PredictorModel.calculateEnhancedFactors(
      game.sport,
      homeStats,
      awayStats,
      h2hStats,
      game
    );

    // Generate predictions for each type
    const predictions: Prediction[] = [];
    const predictionTypes: PredictionType[] = ['SPREAD', 'MONEYLINE', 'TOTAL'];
    
    for (const type of predictionTypes) {
      const confidence = PredictorModel.calculateConfidence(game.sport, type, factors);
      
      const prediction = this.generatePrediction(
        game,
        type,
        factors,
        confidence
      );
      
      if (prediction) {
        predictions.push(prediction);
      }
    }

    return predictions;
  }

  private static generatePrediction(
    game: Game,
    type: PredictionType,
    factors: EnhancedFactors,
    confidence: number
  ): Prediction | null {
    const predictionValue = this.determinePredictionValue(game, type, factors);
    if (predictionValue === null) return null;

    const reasoning = this.generateReasoning(game, type, factors, predictionValue);
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const grade = this.calculateGrade(confidence);

    return {
      id: uniqueId,
      gameId: game.id,
      predictionType: type,
      predictionValue: typeof predictionValue === 'number' ? predictionValue : 0,
      confidence,
      grade,
      reasoning,
      createdAt: new Date().toISOString()
    };
  }

  private static calculateGrade(confidence: number): string {
    if (confidence >= 90) return 'A+';
    if (confidence >= 85) return 'A';
    if (confidence >= 80) return 'A-';
    if (confidence >= 75) return 'B+';
    if (confidence >= 70) return 'B';
    if (confidence >= 65) return 'B-';
    if (confidence >= 60) return 'C+';
    if (confidence >= 55) return 'C';
    if (confidence >= 50) return 'C-';
    if (confidence >= 45) return 'D+';
    if (confidence >= 40) return 'D';
    return 'F';
  }

  private static determinePredictionValue(game: Game, type: PredictionType, factors: EnhancedFactors): number | null {
    // Implementation of determinePredictionValue method
    // This method should return the predicted value based on the given factors and game type
    // For example, you might implement different logic based on the type of prediction
    // and the factors available.
    // This is a placeholder and should be replaced with the actual implementation
    return null;
  }

  private static generateReasoning(game: Game, type: PredictionType, factors: EnhancedFactors, predictionValue: number): string {
    // Implementation of generateReasoning method
    // This method should return the reasoning text based on the given game, type, factors, and prediction value
    // For example, you might implement different logic based on the type of prediction
    // and the factors available.
    // This is a placeholder and should be replaced with the actual implementation
    return '';
  }
}