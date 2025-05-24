// Advanced Pitcher Stats Model
export interface PitcherStats {
  playerId: string;
  name: string;
  team: string;
  season: string;
  gamesStarted: number;
  inningsPitched: number;
  era: number;
  fip: number;
  xfip?: number;
  siera?: number;
  kPer9: number;
  bbPer9: number;
  kbb: number;
  whip: number;
  recentPitchCounts: number[]; // last 5 starts
  hand: 'L' | 'R';
  vsHandednessSplits?: {
    vsL: Partial<PitcherStats>;
    vsR: Partial<PitcherStats>;
  };
  lastUpdated: string;
}
