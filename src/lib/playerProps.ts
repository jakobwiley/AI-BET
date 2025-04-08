import { PlayerProp, SportType, PlayerPropType } from '@/models/types';

const STATIC_NBA_PROPS = [
  {
    name: 'Luka Doncic',
    team: 'DAL',
    statType: 'points',
    line: 32.5,
    overOdds: -110,
    underOdds: -110
  },
  {
    name: 'Nikola Jokic',
    team: 'DEN',
    statType: 'rebounds',
    line: 12.5,
    overOdds: -115,
    underOdds: -105
  },
  {
    name: 'Trae Young',
    team: 'ATL',
    statType: 'assists',
    line: 10.5,
    overOdds: -120,
    underOdds: +100
  }
];

const STATIC_MLB_PROPS = [
  {
    name: 'Shohei Ohtani',
    team: 'LAD',
    statType: 'strikeouts',
    line: 8.5,
    overOdds: -110,
    underOdds: -110
  },
  {
    name: 'Juan Soto',
    team: 'NYY',
    statType: 'hits',
    line: 1.5,
    overOdds: +120,
    underOdds: -140
  },
  {
    name: 'Mookie Betts',
    team: 'LAD',
    statType: 'runs',
    line: 0.5,
    overOdds: -130,
    underOdds: +110
  }
];

interface PlayerPropData {
  name: string;
  team: string;
  statType: string;
  line: number;
  overOdds: number;
  underOdds: number;
}

export class PlayerPropsService {
  private mapPropType(rawType: string, sport: SportType): PlayerPropType {
    if (sport === 'NBA') {
      switch (rawType.toLowerCase()) {
        case 'points': return 'POINTS';
        case 'rebounds': return 'REBOUNDS';
        case 'assists': return 'ASSISTS';
        case 'threes': return 'THREE_POINTERS';
        case 'blocks': return 'BLOCKS';
        case 'steals': return 'STEALS';
        case 'turnovers': return 'TURNOVERS';
        default: return 'POINTS';
      }
    } else {
      switch (rawType.toLowerCase()) {
        case 'strikeouts': return 'STRIKEOUTS';
        case 'hits': return 'HITS';
        case 'runs': return 'RUNS';
        case 'rbi': return 'RBI';
        case 'home_runs': return 'HOME_RUNS';
        case 'walks': return 'WALKS';
        case 'stolen_bases': return 'STOLEN_BASES';
        default: return 'HITS';
      }
    }
  }

  private convertToPlayerProp(prop: PlayerPropData, sport: SportType): PlayerProp {
    return {
      id: `${prop.name}-${prop.statType}-${Date.now()}`,
      gameId: '',
      playerName: prop.name,
      teamName: prop.team,
      propType: this.mapPropType(prop.statType, sport),
      line: prop.line,
      odds: prop.overOdds,
      confidence: 0.5,
      reasoning: `Based on recent performance and matchup analysis`
    };
  }

  async getPopularPlayerProps(sport: SportType): Promise<PlayerProp[]> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const props = sport === 'NBA' ? STATIC_NBA_PROPS : STATIC_MLB_PROPS;
      return props.map(prop => this.convertToPlayerProp(prop, sport));
    } catch (error) {
      console.error(`[PlayerProps] Error fetching ${sport} props:`, error);
      return [];
    }
  }
} 