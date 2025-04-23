function formatPredictionValue(prediction, game) {
  // Parse odds if they're in string format
  let odds = game.odds;
  if (typeof game.odds === 'string') {
    try {
      odds = JSON.parse(game.odds);
    } catch (e) {
      console.error('Failed to parse odds:', e);
    }
  }
  
  // Also check oddsJson field
  if (!odds && game.oddsJson) {
    try {
      odds = typeof game.oddsJson === 'string' ? JSON.parse(game.oddsJson) : game.oddsJson;
    } catch (e) {
      console.error('Failed to parse oddsJson:', e);
    }
  }

  switch (prediction.predictionType) {
    case 'SPREAD':
      if (odds?.spread) {
        const spreadValue = prediction.predictionValue > 0 ? odds.spread.homeSpread : odds.spread.awaySpread;
        const spreadOdds = prediction.predictionValue > 0 ? odds.spread.homeOdds : odds.spread.awayOdds;
        return `${prediction.predictionValue > 0 ? game.homeTeamName : game.awayTeamName} ${spreadValue > 0 ? '+' : ''}${spreadValue} (${spreadOdds})`;
      }
      return `${prediction.predictionValue > 0 ? game.homeTeamName : game.awayTeamName} ${prediction.predictionValue > 0 ? '+' : ''}${prediction.predictionValue}`;
      
    case 'MONEYLINE':
      if (odds?.moneyline) {
        const mlOdds = prediction.predictionValue > 0 ? odds.moneyline.homeOdds : odds.moneyline.awayOdds;
        return `${prediction.predictionValue > 0 ? game.homeTeamName : game.awayTeamName} (${mlOdds > 0 ? '+' : ''}${mlOdds})`;
      }
      return `${prediction.predictionValue > 0 ? game.homeTeamName : game.awayTeamName} ML`;
      
    case 'TOTAL':
      if (odds?.total) {
        const totalValue = odds.total.overUnder;
        const totalOdds = prediction.predictionValue > 0 ? odds.total.overOdds : odds.total.underOdds;
        return `${prediction.predictionValue > 0 ? 'OVER' : 'UNDER'} ${totalValue} (${totalOdds > 0 ? '+' : ''}${totalOdds})`;
      }
      return `${prediction.predictionValue > 0 ? 'OVER' : 'UNDER'} ${Math.abs(prediction.predictionValue)}`;
      
    default:
      return prediction.predictionValue?.toString() || 'N/A';
  }
} 