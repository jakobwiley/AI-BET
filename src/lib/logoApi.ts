import { SportType } from '@/models/types';

const NBA_LOGO_BASE_URL = 'https://a.espncdn.com/i/teamlogos/nba/500/';
const MLB_LOGO_BASE_URL = 'https://a.espncdn.com/i/teamlogos/mlb/500/';

// ESPN team ID mappings
const NBA_TEAM_IDS: { [key: string]: string } = {
  'hawks': 'atl',
  'celtics': 'bos',
  'nets': 'bkn',
  'hornets': 'cha',
  'bulls': 'chi',
  'cavaliers': 'cle',
  'mavericks': 'dal',
  'nuggets': 'den',
  'pistons': 'det',
  'warriors': 'gs',
  'rockets': 'hou',
  'pacers': 'ind',
  'clippers': 'lac',
  'lakers': 'lal',
  'grizzlies': 'mem',
  'heat': 'mia',
  'bucks': 'mil',
  'timberwolves': 'min',
  'pelicans': 'no',
  'knicks': 'ny',
  'thunder': 'okc',
  'magic': 'orl',
  '76ers': 'phi',
  'suns': 'phx',
  'blazers': 'por',
  'kings': 'sac',
  'spurs': 'sa',
  'raptors': 'tor',
  'jazz': 'utah',
  'wizards': 'wsh'
};

const MLB_TEAM_IDS: { [key: string]: string } = {
  'angels': 'laa',
  'astros': 'hou',
  'athletics': 'oak',
  'blue jays': 'tor',
  'braves': 'atl',
  'brewers': 'mil',
  'cardinals': 'stl',
  'cubs': 'chc',
  'diamondbacks': 'ari',
  'dodgers': 'lad',
  'giants': 'sf',
  'guardians': 'cle',
  'mariners': 'sea',
  'marlins': 'mia',
  'mets': 'nym',
  'nationals': 'wsh',
  'orioles': 'bal',
  'padres': 'sd',
  'phillies': 'phi',
  'pirates': 'pit',
  'rangers': 'tex',
  'rays': 'tb',
  'red sox': 'bos',
  'reds': 'cin',
  'rockies': 'col',
  'royals': 'kc',
  'tigers': 'det',
  'twins': 'min',
  'white sox': 'cws',
  'yankees': 'nyy'
};

export class LogoApiService {
  static getTeamLogoUrl(sport: SportType, teamName: string): string {
    const normalizedTeamName = teamName.toLowerCase().trim();
    let teamId: string | undefined;
    let baseUrl: string;

    if (sport === 'NBA') {
      teamId = NBA_TEAM_IDS[normalizedTeamName];
      baseUrl = NBA_LOGO_BASE_URL;
    } else {
      teamId = MLB_TEAM_IDS[normalizedTeamName];
      baseUrl = MLB_LOGO_BASE_URL;
    }

    if (!teamId) {
      console.warn(`No logo mapping found for ${sport} team: ${teamName}`);
      return this.getFallbackLogoUrl();
    }

    return `${baseUrl}${teamId}.png`;
  }

  static getFallbackLogoUrl(): string {
    return '/placeholder-team-logo.svg';
  }
} 