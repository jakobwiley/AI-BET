import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://sports.yahoo.com/mlb/scoreboard/', { waitUntil: 'networkidle' });

  // Wait for the React app to load games
  await page.waitForSelector('[data-ylk*="mlb.g."]', { timeout: 15000 });

  // Evaluate in browser context
  const games = await page.evaluate(() => {
    // Find the global state object
    // @ts-ignore
    const root = window.root || window.YAHOO || {};
    // Try to find the games in the React state
    let games = [];
    try {
      // @ts-ignore
      const state = window.__PRELOADED_STATE__ || (root.context && root.context.dispatcher && root.context.dispatcher.stores && root.context.dispatcher.stores.GamesStore && root.context.dispatcher.stores.GamesStore.games);
      if (state && typeof state === 'object') {
        for (const key in state) {
          if (key.startsWith('mlb.g.')) {
            const game = state[key];
            games.push({
              home: game.teams ? game.teams[1]?.display_name : 'Unknown',
              away: game.teams ? game.teams[0]?.display_name : 'Unknown',
              start: game.status_display_name || game.start_time || 'TBD',
              spread: game.odds && game.odds['101'] ? `${game.odds['101'].away_spread} (${game.odds['101'].away_line}) / ${game.odds['101'].home_spread} (${game.odds['101'].home_line})` : 'N/A',
              moneyline: game.odds && game.odds['101'] ? `Away: ${game.odds['101'].away_ml}, Home: ${game.odds['101'].home_ml}` : 'N/A',
              total: game.odds && game.odds['101'] ? game.odds['101'].total : 'N/A',
            });
          }
        }
      }
    } catch (e) {}
    return games;
  });

  if (!games.length) {
    console.log('No MLB games found for today.');
  } else {
    console.log('\nMLB Games for Today:');
    for (const g of games) {
      console.log(`- ${g.away} @ ${g.home} (${g.start}) | Spread: ${g.spread} | Moneyline: ${g.moneyline} | Total: ${g.total}`);
    }
  }

  await browser.close();
})(); 