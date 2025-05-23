import { MLBStatsService } from './mlbStatsApi.js';

describe('MLBStatsService', () => {
  describe('processPlayerStats', () => {
    it('should handle empty stats array', () => {
      const result = MLBStatsService['processPlayerStats']([]);
      expect(result).toEqual({
        batting: {
          avg: '0.000',
          obp: '0.000',
          slg: '0.000',
          ops: '0.000',
          wOBA: '0.000',
          wRCPlus: 0,
          bWAR: 0,
          homeRuns: 0,
          rbi: 0,
          stolenBases: 0,
          strikeOutRate: '0.000',
          walkRate: '0.000',
          babip: '0.000',
          iso: '0.000',
          hardHitRate: '0.000',
          barrelRate: '0.000',
          exitVelocity: '0.0',
          launchAngle: '0.0',
        },
        pitching: {
          era: '0.00',
          whip: '0.00',
          fip: '0.00',
          xFIP: '0.00',
          kPer9: '0.0',
          bbPer9: '0.0',
          hrPer9: '0.0',
          babip: '0.000',
          groundBallRate: '0.000',
          flyBallRate: '0.000',
          hardHitRate: '0.000',
          barrelRate: '0.000',
          exitVelocity: '0.0',
          spinRate: '0',
          pitchVelocity: '0.0',
        },
        fielding: {
          defensiveRunsSaved: 0,
          ultimateZoneRating: 0,
          outsAboveAverage: 0,
          fieldingPercentage: '0.000',
          errors: 0,
          assists: 0,
          putouts: 0,
        },
        splits: {
          vsLeft: {
            avg: '0.000',
            ops: '0.000',
            homeRuns: 0,
            strikeOutRate: '0.000',
            walkRate: '0.000',
          },
          vsRight: {
            avg: '0.000',
            ops: '0.000',
            homeRuns: 0,
            strikeOutRate: '0.000',
            walkRate: '0.000',
          },
          home: {
            avg: '0.000',
            ops: '0.000',
            homeRuns: 0,
          },
          away: {
            avg: '0.000',
            ops: '0.000',
            homeRuns: 0,
          },
        },
        historical: {
          last30Days: {
            avg: '0.000',
            ops: '0.000',
            homeRuns: 0,
            era: '0.00',
            whip: '0.00',
          },
          last7Days: {
            avg: '0.000',
            ops: '0.000',
            homeRuns: 0,
            era: '0.00',
            whip: '0.00',
          },
        },
      });
    });

    it('should process batting stats correctly', () => {
      const mockStats = [{
        type: { displayName: 'season' },
        group: { displayName: 'hitting' },
        splits: [{
          stat: {
            avg: '0.300',
            obp: '0.400',
            slg: '0.500',
            ops: '0.900',
            woba: '0.380',
            wrcPlus: 130,
            war: 3.5,
            homeRuns: 25,
            rbi: 80,
            stolenBases: 15,
            strikeOutRate: '0.200',
            walkRate: '0.100',
            babip: '0.320',
            iso: '0.200',
            hardHitRate: '0.450',
            barrelRate: '0.100',
            exitVelocityAvg: '92.5',
            launchAngleAvg: '12.5',
          },
        }],
      }];

      const result = MLBStatsService['processPlayerStats'](mockStats);
      expect(result.batting).toEqual({
        avg: '0.300',
        obp: '0.400',
        slg: '0.500',
        ops: '0.900',
        wOBA: '0.380',
        wRCPlus: 130,
        bWAR: 3.5,
        homeRuns: 25,
        rbi: 80,
        stolenBases: 15,
        strikeOutRate: '0.200',
        walkRate: '0.100',
        babip: '0.320',
        iso: '0.200',
        hardHitRate: '0.450',
        barrelRate: '0.100',
        exitVelocity: '92.5',
        launchAngle: '12.5',
      });
    });

    it('should process pitching stats correctly', () => {
      const mockStats = [{
        type: { displayName: 'season' },
        group: { displayName: 'pitching' },
        splits: [{
          stat: {
            era: '3.50',
            whip: '1.20',
            fip: '3.60',
            xfip: '3.70',
            kPer9: '9.5',
            bbPer9: '2.5',
            hrPer9: '1.0',
            babip: '0.280',
            groundBallRate: '0.450',
            flyBallRate: '0.350',
            hardHitRate: '0.350',
            barrelRate: '0.080',
            exitVelocityAvg: '88.5',
            spinRateAvg: '2200',
            pitchVelocityAvg: '94.5',
          },
        }],
      }];

      const result = MLBStatsService['processPlayerStats'](mockStats);
      expect(result.pitching).toEqual({
        era: '3.50',
        whip: '1.20',
        fip: '3.60',
        xFIP: '3.70',
        kPer9: '9.5',
        bbPer9: '2.5',
        hrPer9: '1.0',
        babip: '0.280',
        groundBallRate: '0.450',
        flyBallRate: '0.350',
        hardHitRate: '0.350',
        barrelRate: '0.080',
        exitVelocity: '88.5',
        spinRate: '2200',
        pitchVelocity: '94.5',
      });
    });

    it('should process fielding stats correctly', () => {
      const mockStats = [{
        type: { displayName: 'season' },
        group: { displayName: 'fielding' },
        splits: [{
          stat: {
            defensiveRunsSaved: 10,
            ultimateZoneRating: 5.5,
            outsAboveAverage: 8,
            fieldingPercentage: '0.985',
            errors: 5,
            assists: 150,
            putouts: 200,
          },
        }],
      }];

      const result = MLBStatsService['processPlayerStats'](mockStats);
      expect(result.fielding).toEqual({
        defensiveRunsSaved: 10,
        ultimateZoneRating: 5.5,
        outsAboveAverage: 8,
        fieldingPercentage: '0.985',
        errors: 5,
        assists: 150,
        putouts: 200,
      });
    });

    it('should process splits correctly', () => {
      const mockStats = [{
        type: { displayName: 'vsRHP' },
        group: { displayName: 'splits' },
        splits: [{
          stat: {
            avg: '0.280',
            ops: '0.850',
            homeRuns: 15,
            strikeOutRate: '0.220',
            walkRate: '0.090',
          },
        }],
      }, {
        type: { displayName: 'vsLHP' },
        group: { displayName: 'splits' },
        splits: [{
          stat: {
            avg: '0.320',
            ops: '0.950',
            homeRuns: 10,
            strikeOutRate: '0.180',
            walkRate: '0.110',
          },
        }],
      }];

      const result = MLBStatsService['processPlayerStats'](mockStats);
      expect(result.splits.vsRight).toEqual({
        avg: '0.280',
        ops: '0.850',
        homeRuns: 15,
        strikeOutRate: '0.220',
        walkRate: '0.090',
      });
      expect(result.splits.vsLeft).toEqual({
        avg: '0.320',
        ops: '0.950',
        homeRuns: 10,
        strikeOutRate: '0.180',
        walkRate: '0.110',
      });
    });

    it('should process historical stats correctly', () => {
      const mockStats = [{
        type: { displayName: 'last30Days' },
        group: { displayName: 'gameLog' },
        splits: [{
          stat: {
            avg: '0.350',
            ops: '1.000',
            homeRuns: 8,
            era: '2.50',
            whip: '1.00',
          },
        }],
      }, {
        type: { displayName: 'last7Days' },
        group: { displayName: 'gameLog' },
        splits: [{
          stat: {
            avg: '0.400',
            ops: '1.100',
            homeRuns: 3,
            era: '1.50',
            whip: '0.80',
          },
        }],
      }];

      const result = MLBStatsService['processPlayerStats'](mockStats);
      expect(result.historical.last30Days).toEqual({
        avg: '0.350',
        ops: '1.000',
        homeRuns: 8,
        era: '2.50',
        whip: '1.00',
      });
      expect(result.historical.last7Days).toEqual({
        avg: '0.400',
        ops: '1.100',
        homeRuns: 3,
        era: '1.50',
        whip: '0.80',
      });
    });

    it('should handle missing or invalid values', () => {
      const mockStats = [{
        type: { displayName: 'season' },
        group: { displayName: 'hitting' },
        splits: [{
          stat: {
            avg: undefined,
            obp: null,
            slg: 'invalid',
            ops: '',
          },
        }],
      }];

      const result = MLBStatsService['processPlayerStats'](mockStats);
      expect(result.batting.avg).toBe('0.000');
      expect(result.batting.obp).toBe('0.000');
      expect(result.batting.slg).toBe('0.000');
      expect(result.batting.ops).toBe('0.000');
    });
  });
}); 