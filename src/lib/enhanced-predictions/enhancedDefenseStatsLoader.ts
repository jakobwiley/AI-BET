import fs from 'fs';
import path from 'path';

export interface EnhancedDefenseStats {
  team: string;
  season: number;
  oaa: number;
  fielding_pct: number;
  errors: number;
  assists: number;
  putouts: number;
}

export class EnhancedDefenseStatsLoader {
  private static get DATA_PATH() {
    const today = new Date().toISOString().slice(0, 10);
    return path.resolve(process.cwd(), 'data', `enhanced_defense_stats_${today}.json`);
  }
  private static cache: EnhancedDefenseStats[] | null = null;

  static loadStats(): EnhancedDefenseStats[] {
    if (this.cache) return this.cache;
    if (!fs.existsSync(this.DATA_PATH)) {
      throw new Error(`Enhanced defense stats file not found at ${this.DATA_PATH}`);
    }
    const data = JSON.parse(fs.readFileSync(this.DATA_PATH, 'utf8'));
    this.cache = data;
    return data;
  }

  static getStatsForTeam(teamName: string): EnhancedDefenseStats | undefined {
    const stats = this.loadStats();
    return stats.find(s => s.team === teamName);
  }
}
