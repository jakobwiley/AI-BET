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
    return Object.values(this.statsMap).find((h) =>
      h.name.trim().toLowerCase() === lower
    );
  }

  /**
   * List all hitters with stats
   */
  listAll(): HitterStats[] {
    return Object.values(this.statsMap);
  }
}

// Example usage/test (can be removed or moved to a test file)
if (require.main === module) {
  try {
    const loader = new HitterStatsLoader();
    const judge = loader.getByName('Aaron Judge');
    if (judge) {
      console.log('Aaron Judge stats:', JSON.stringify(judge, null, 2));
    } else {
      console.log('Aaron Judge not found');
    }
    // List first 3 hitters
    console.log('Sample hitters:', loader.listAll().slice(0, 3));
  } catch (err) {
    console.error(err);
  }
}
