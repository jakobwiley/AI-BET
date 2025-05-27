import fs from 'fs';
import path from 'path';

export interface HitterStats {
  name: string;
  recent: {
    [days: string]: {
      G: number;
      AB: number;
      H: number;
      HR: number;
      RBI: number;
      BB: number;
      K: number;
      '2B': number;
      '3B': number;
      PA: number;
      TB: number;
      AVG: number;
      OBP: number;
      SLG: number;
      OPS: number;
    };
  };
  splits: {
    home: any;
    away: any;
  };
  vs_hand?: {
    L: any;
    R: any;
    recent: {
      [days: string]: {
        L: any;
        R: any;
      };
    };
  };
  streaks: {
    hit: number;
    on_base: number;
    multi_hit: number;
    hr: number;
  };
}

export interface HitterStatsMap {
  [mlbamId: string]: HitterStats;
}

export class HitterStatsLoader {
  private statsMap: HitterStatsMap = {};

  constructor(jsonPath?: string) {
    // Default to today's file if not provided
    const today = new Date();
    // ESM-compatible __dirname
    const __filename = new URL(import.meta.url).pathname;
    const __dirname = path.dirname(__filename);
    const defaultPath = path.join(
      __dirname,
      '../../data',
      `hitter_splits_streaks_${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.json`
    );
    const filePath = jsonPath || defaultPath;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Hitter stats JSON not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    this.statsMap = JSON.parse(raw);
  }

  /**
   * Get stats for a hitter by MLBAM ID (string or number)
   */
  getById(mlbamId: string | number): HitterStats | undefined {
    return this.statsMap[String(mlbamId)];
  }

  /**
   * Get stats for a hitter by (case-insensitive) name
   */
  getByName(name: string): HitterStats | undefined {
    const lower = name.trim().toLowerCase();
    // 1. Exact match (case-insensitive)
    let found = Object.values(this.statsMap).find((h) =>
      h.name.trim().toLowerCase() === lower
    );
    if (found) return found;
    // 2. Last name only match
    const last = lower.split(' ').pop();
    found = Object.values(this.statsMap).find((h) =>
      h.name.trim().toLowerCase().split(' ').pop() === last
    );
    if (found) return found;
    // 3. Partial match (name is substring)
    found = Object.values(this.statsMap).find((h) =>
      h.name.trim().toLowerCase().includes(lower) || lower.includes(h.name.trim().toLowerCase())
    );
    if (found) return found;
    // 4. Remove punctuation and try again
    const simple = lower.replace(/[^a-z]/g, '');
    found = Object.values(this.statsMap).find((h) =>
      h.name.trim().toLowerCase().replace(/[^a-z]/g, '') === simple
    );
    return found;
  }
  // For debugging: log all possible matches
  getByNameFuzzy(name: string): string[] {
    const lower = name.trim().toLowerCase();
    return Object.values(this.statsMap)
      .filter((h) => h.name.toLowerCase().includes(lower) || lower.includes(h.name.toLowerCase()))
      .map(h => h.name);
  }

  /**
   * List all hitters with stats
   */
  listAll(): HitterStats[] {
    return Object.values(this.statsMap);
  }
}

// Example usage/test (ESM-compatible entrypoint)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const loader = new HitterStatsLoader();
      const judge = loader.getByName('Aaron Judge');
      if (judge) {
        console.log('Aaron Judge vs_hand splits:', JSON.stringify(judge.vs_hand, null, 2));
        if (judge.vs_hand && judge.vs_hand.recent) {
          console.log('Aaron Judge recent vs_hand splits (7 days):', JSON.stringify(judge.vs_hand.recent['7'], null, 2));
        }
      } else {
        console.log('Aaron Judge not found');
      }
      // List first 3 hitters
      console.log('Sample hitters:', loader.listAll().slice(0, 3));
    } catch (err) {
      console.error(err);
    }
  })();
}
