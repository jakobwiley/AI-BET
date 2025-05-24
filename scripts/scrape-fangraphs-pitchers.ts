import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// FanGraphs pitcher leaderboard URL for 2025 season
const FG_URL = 'https://www.fangraphs.com/leaders.aspx?pos=all&stats=pit&type=1&season=2025&team=all&lg=all&qual=0';

async function scrapeFanGraphsPitchers() {
  const response = await axios.get(FG_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 20000,
  });
  const $ = cheerio.load(response.data);
  const rows = $('table#LeaderBoard1_dg1 tr');

  // Get column headers
  const headers: string[] = [];
  rows.first().find('th').each((_, th) => {
    headers.push($(th).text().trim());
  });

  // Parse pitcher rows
  const pitchers: any[] = [];
  rows.slice(1).each((_, tr) => {
    const cols = $(tr).find('td');
    if (cols.length < 5) return; // skip non-data rows
    const pitcher: any = {};
    cols.each((i, td) => {
      pitcher[headers[i] || `col${i}`] = $(td).text().trim();
    });
    pitchers.push(pitcher);
  });

  // Output to JSON
  const outPath = path.join(__dirname, '../data/fangraphsPitchers.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(pitchers, null, 2), 'utf8');
  console.log(`Scraped ${pitchers.length} pitchers to ${outPath}`);
}

scrapeFanGraphsPitchers().catch(err => {
  console.error('Error scraping FanGraphs:', err.message);
  process.exit(1);
});
