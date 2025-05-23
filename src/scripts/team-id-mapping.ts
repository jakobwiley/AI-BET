// Maps all observed team ID/name variants to the correct MLB abbreviation
export const TEAM_ID_TO_ABBR: { [key: string]: string } = {
  // Standard abbreviations and variants
  'ARI': 'ARI', 'ATL': 'ATL', 'BAL': 'BAL', 'BOS': 'BOS', 'CHC': 'CHC', 
  'CIN': 'CIN', 'CLE': 'CLE', 'COL': 'COL', 'CWS': 'CHW', 'DET': 'DET', 
  'HOU': 'HOU', 'KCR': 'KC', 'LAA': 'LAA', 'LAD': 'LAD', 'MIA': 'MIA', 
  'MIL': 'MIL', 'MIN': 'MIN', 'NYM': 'NYM', 'NYY': 'NYY', 'OAK': 'OAK', 
  'PHI': 'PHI', 'PIT': 'PIT', 'SDP': 'SD', 'SEA': 'SEA', 'SFG': 'SF', 
  'STL': 'STL', 'TBR': 'TB', 'TEX': 'TEX', 'TOR': 'TOR', 'WSN': 'WSH',

  // Full team names
  'Arizona Diamondbacks': 'ARI', 'Atlanta Braves': 'ATL', 'Baltimore Orioles': 'BAL', 
  'Boston Red Sox': 'BOS', 'Chicago Cubs': 'CHC', 'Cincinnati Reds': 'CIN', 
  'Cleveland Guardians': 'CLE', 'Colorado Rockies': 'COL', 'Chicago White Sox': 'CHW', 
  'Detroit Tigers': 'DET', 'Houston Astros': 'HOU', 'Kansas City Royals': 'KC', 
  'Los Angeles Angels': 'LAA', 'Los Angeles Dodgers': 'LAD', 'Miami Marlins': 'MIA', 
  'Milwaukee Brewers': 'MIL', 'Minnesota Twins': 'MIN', 'New York Mets': 'NYM', 
  'New York Yankees': 'NYY', 'Oakland Athletics': 'OAK', 'Philadelphia Phillies': 'PHI', 
  'Pittsburgh Pirates': 'PIT', 'San Diego Padres': 'SD', 'Seattle Mariners': 'SEA', 
  'San Francisco Giants': 'SF', 'St. Louis Cardinals': 'STL', 'Tampa Bay Rays': 'TB', 
  'Texas Rangers': 'TEX', 'Toronto Blue Jays': 'TOR', 'Washington Nationals': 'WSH',

  // CamelCase/No-space
  'ArizonaDiamondbacks': 'ARI', 'AtlantaBraves': 'ATL', 'BaltimoreOrioles': 'BAL', 
  'BostonRedSox': 'BOS', 'ChicagoCubs': 'CHC', 'CincinnatiReds': 'CIN', 
  'ClevelandGuardians': 'CLE', 'ColoradoRockies': 'COL', 'ChicagoWhiteSox': 'CHW', 
  'DetroitTigers': 'DET', 'HoustonAstros': 'HOU', 'KansasCityRoyals': 'KC', 
  'LosAngelesAngels': 'LAA', 'LosAngelesDodgers': 'LAD', 'MiamiMarlins': 'MIA', 
  'MilwaukeeBrewers': 'MIL', 'MinnesotaTwins': 'MIN', 'NewYorkMets': 'NYM', 
  'NewYorkYankees': 'NYY', 'OaklandAthletics': 'OAK', 'PhiladelphiaPhillies': 'PHI', 
  'PittsburghPirates': 'PIT', 'SanDiegoPadres': 'SD', 'SeattleMariners': 'SEA', 
  'SanFranciscoGiants': 'SF', 'StLouisCardinals': 'STL', 'TampaBayRays': 'TB', 
  'TexasRangers': 'TEX', 'TorontoBlueJays': 'TOR', 'WashingtonNationals': 'WSH',

  // Kebab-case
  'arizona-diamondbacks': 'ARI', 'atlanta-braves': 'ATL', 'baltimore-orioles': 'BAL', 
  'boston-red-sox': 'BOS', 'chicago-cubs': 'CHC', 'cincinnati-reds': 'CIN', 
  'cleveland-guardians': 'CLE', 'colorado-rockies': 'COL', 'chicago-white-sox': 'CHW', 
  'detroit-tigers': 'DET', 'houston-astros': 'HOU', 'kansas-city-royals': 'KC', 
  'los-angeles-angels': 'LAA', 'los-angeles-dodgers': 'LAD', 'miami-marlins': 'MIA', 
  'milwaukee-brewers': 'MIL', 'minnesota-twins': 'MIN', 'new-york-mets': 'NYM', 
  'new-york-yankees': 'NYY', 'oakland-athletics': 'OAK', 'philadelphia-phillies': 'PHI', 
  'pittsburgh-pirates': 'PIT', 'san-diego-padres': 'SD', 'seattle-mariners': 'SEA', 
  'san-francisco-giants': 'SF', 'st.-louis-cardinals': 'STL', 'tampa-bay-rays': 'TB', 
  'texas-rangers': 'TEX', 'toronto-blue-jays': 'TOR', 'washington-nationals': 'WSH'
}; 