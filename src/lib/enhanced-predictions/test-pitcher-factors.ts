import { PredictorModel } from './predictorModel.ts';

// Minimal local type stubs for this test
// Remove if not needed for your actual logic
export type PredictionType = 'SPREAD' | 'MONEYLINE' | 'TOTAL';
export interface Game {
  id?: string;
  homeTeam?: string;
  awayTeam?: string;
  // Add more fields as needed for further testing
}

// Minimal mock TeamStats with advanced pitcher stats for home and away
const homeStats = {
  wins: 30,
  losses: 20,
  runsScored: 210,
  runsAllowed: 180,
  teamERA: 3.2,
  teamWHIP: 1.12,
  keyPlayers: {
    pitching: [
      {
        era: '2.95',
        whip: '1.05',
        fip: '3.10',
        xfip: '3.25',
        siera: '3.20',
        kbb: '4.5',
        war: '2.8',
      }
    ]
  }
};

const awayStats = {
  wins: 28,
  losses: 22,
  runsScored: 200,
  runsAllowed: 195,
  teamERA: 3.85,
  teamWHIP: 1.22,
  keyPlayers: {
    pitching: [
      {
        era: '3.80',
        whip: '1.18',
        fip: '3.90',
        xfip: '4.05',
        siera: '3.95',
        kbb: '3.2',
        war: '2.0',
      }
    ]
  }
};

console.log('--- Testing Enhanced Pitcher Factor Calculations ---');

const matchupFactor = PredictorModel['calculateMlbPitcherMatchupFactor'](homeStats as any, awayStats as any);
console.log('Pitcher Matchup Factor:', matchupFactor);

const teamPitchingFactor = PredictorModel['calculateMlbTeamPitchingFactor'](homeStats as any, awayStats as any);
console.log('Team Pitching Factor:', teamPitchingFactor);

const pitchingStrength = PredictorModel['calculateMlbPitchingStrengthFactor'](homeStats as any, awayStats as any);
console.log('Pitching Strength Factor:', pitchingStrength);

const keyPlayerImpact = PredictorModel['calculateMlbKeyPlayerImpactFactor'](homeStats as any, awayStats as any);
console.log('Key Player Impact Factor:', keyPlayerImpact);

console.log('--- End of Test ---');
