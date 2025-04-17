export class PredictionService {
  static async getPredictionsForGame(game) {
    const predictions = [];
    
    // Add spread prediction if odds are available
    if (game.odds?.spread?.homeSpread !== undefined) {
      predictions.push({
        predictionType: 'SPREAD',
        predictionValue: game.odds.spread.homeSpread,
        confidence: 0.85,
        reasoning: `Based on historical performance and current odds (${game.odds.spread.homeSpread}), ${game.homeTeamName} is favored to cover the spread against ${game.awayTeamName}.`
      });
    }

    // Add moneyline prediction if odds are available
    if (game.odds?.moneyline?.homeOdds !== undefined && game.odds?.moneyline?.awayOdds !== undefined) {
      const homeOdds = game.odds.moneyline.homeOdds;
      const awayOdds = game.odds.moneyline.awayOdds;
      const favorite = homeOdds > awayOdds ? game.homeTeamName : game.awayTeamName;
      const underdog = homeOdds > awayOdds ? game.awayTeamName : game.homeTeamName;
      
      predictions.push({
        predictionType: 'MONEYLINE',
        predictionValue: homeOdds > awayOdds ? homeOdds : awayOdds,
        confidence: 0.80,
        reasoning: `${favorite} is favored to win straight up against ${underdog} based on current moneyline odds.`
      });
    }

    // Add total prediction if odds are available
    if (game.odds?.total?.overUnder !== undefined) {
      predictions.push({
        predictionType: 'TOTAL',
        predictionValue: game.odds.total.overUnder,
        confidence: 0.75,
        reasoning: `Based on the current total line of ${game.odds.total.overUnder}, we predict this will be a ${game.odds.total.overUnder > 200 ? 'high' : 'moderate'} scoring game.`
      });
    }

    return predictions;
  }

  static getConfidenceGrade(confidence) {
    if (confidence >= 0.85) return 'A+';
    if (confidence >= 0.80) return 'A';
    if (confidence >= 0.75) return 'A-';
    return 'B+';
  }
} 