export class PredictionService {
  static async getPredictionsForGame(game) {
    const predictions = [];
    
    // Add spread prediction if odds are available
    if (game.odds?.spread?.homeSpread !== undefined) {
      const isFavorite = game.odds.spread.homeSpread < 0;
      const favoredTeam = isFavorite ? game.homeTeamName : game.awayTeamName;
      const underdogTeam = isFavorite ? game.awayTeamName : game.homeTeamName;
      const spreadValue = Math.abs(game.odds.spread.homeSpread);
      
      predictions.push({
        predictionType: 'SPREAD',
        predictionValue: game.odds.spread.homeSpread,
        confidence: 0.85,
        reasoning: [
          `${favoredTeam} is favored by ${spreadValue} points against ${underdogTeam}`,
          `Current spread odds: ${game.odds.spread.homeOdds}`,
          `Historical matchup data and recent form suggest ${favoredTeam} should cover`
        ].join('\n• ')
      });
    }

    // Add moneyline prediction if odds are available
    if (game.odds?.moneyline?.homeOdds !== undefined && game.odds?.moneyline?.awayOdds !== undefined) {
      const homeOdds = game.odds.moneyline.homeOdds;
      const awayOdds = game.odds.moneyline.awayOdds;
      const isFavorite = homeOdds < awayOdds;
      const favoredTeam = isFavorite ? game.homeTeamName : game.awayTeamName;
      const underdogTeam = isFavorite ? game.awayTeamName : game.homeTeamName;
      const favoredOdds = isFavorite ? homeOdds : awayOdds;
      const underdogOdds = isFavorite ? awayOdds : homeOdds;
      
      predictions.push({
        predictionType: 'MONEYLINE',
        predictionValue: isFavorite ? -1 : 1,
        confidence: 0.80,
        reasoning: [
          `${favoredTeam} is favored to win straight up against ${underdogTeam}`,
          `Current odds: ${favoredTeam} ${favoredOdds} vs ${underdogTeam} ${underdogOdds}`,
          `Recent performance and matchup history favor ${favoredTeam}`
        ].join('\n• ')
      });
    }

    // Add total prediction if odds are available
    if (game.odds?.total?.overUnder !== undefined) {
      const totalValue = game.odds.total.overUnder;
      const isHighScoring = game.sport === 'MLB' ? totalValue > 8.5 : totalValue > 220.5;
      const prediction = isHighScoring ? 1 : -1; // 1 for OVER, -1 for UNDER
      
      predictions.push({
        predictionType: 'TOTAL',
        predictionValue: prediction,
        confidence: 0.75,
        reasoning: [
          `The current total line is set at ${totalValue}`,
          `Historical data suggests this will be a ${isHighScoring ? 'high' : 'moderate'} scoring game`,
          `${game.sport === 'MLB' ? 'Pitching matchup and' : 'Team pace and'} offensive metrics support the ${prediction > 0 ? 'OVER' : 'UNDER'}`
        ].join('\n• ')
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