import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FG_URL = 'https://www.fangraphs.com/leaders.aspx?pos=all&stats=pit&type=1&season=2025&team=all&lg=all&qual=0';

async function scrapeFanGraphsPitchersPuppeteer() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36');
  await page.goto(FG_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for the page to load
  await page.waitForSelector('body', { timeout: 20000 });

  // Try to find the leaderboard table
  const tableExists = await page.$('table#LeaderBoard1_dg1');
  if (!tableExists) {
    // Save screenshot and HTML for debugging
    const debugDir = path.join(__dirname, '../data/fangraphs_debug');
    fs.mkdirSync(debugDir, { recursive: true });
    const screenshotPath = path.join(debugDir, 'fangraphs_leaderboard.png');
    const htmlPath = path.join(debugDir, 'fangraphs_leaderboard.html');
    await page.screenshot({ path: screenshotPath });
    const html = await page.content();
    fs.writeFileSync(htmlPath, html, 'utf8');
    await browser.close();
    throw new Error(`Leaderboard table not found! Screenshot and HTML saved to ${debugDir}`);
  }

  // Get table headers
  const headers = await page.$$eval('table#LeaderBoard1_dg1 thead tr th', ths => ths.map(th => th.textContent?.trim() || ''));

  // Get table rows
  const pitchers = await page.$$eval('table#LeaderBoard1_dg1 tbody tr', (rows, headers) => {
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 5) return null;
      const pitcher: any = {};
      cells.forEach((cell, i) => {
        pitcher[headers[i] || `col${i}`] = cell.textContent?.trim() || '';
      });
      return pitcher;
    }).filter(Boolean);
  }, headers);

  await browser.close();

  // Output to JSON
  const outPath = path.join(__dirname, '../data/fangraphsPitchers.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(pitchers, null, 2), 'utf8');
  console.log(`Scraped ${pitchers.length} pitchers to ${outPath}`);
}

scrapeFanGraphsPitchersPuppeteer().catch(err => {
  console.error('Error scraping FanGraphs (Puppeteer):', err.message);
  process.exit(1);
});
