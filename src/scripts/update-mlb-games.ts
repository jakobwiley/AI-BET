import { prisma } from '../lib/prisma.ts';
import { MLBStatsService } from '../lib/mlbStatsApi.ts';
import type { Game } from '@prisma/client';

// Team name normalization map
const TEAM_NAME_MAP: Record<string, string> = {
  'Washington Nationals': 'Washington Nationals',
  'WashingtonNationals': 'Washington Nationals',
  'Atlanta Braves': 'Atlanta Braves',
  'Baltimore Orioles': 'Baltimore Orioles',
  'BaltimoreOrioles': 'Baltimore Orioles',
  'Boston Red Sox': 'Boston Red Sox',
  'BostonRedSox': 'Boston Red Sox',
  'Chicago Cubs': 'Chicago Cubs',
  'ChicagoCubs': 'Chicago Cubs',
  'Chicago White Sox': 'Chicago White Sox',
  'ChicagoWhiteSox': 'Chicago White Sox',
  'Cincinnati Reds': 'Cincinnati Reds',
  'CincinnatiReds': 'Cincinnati Reds',
  'Cleveland Guardians': 'Cleveland Guardians',
  'ClevelandGuardians': 'Cleveland Guardians',
  'Colorado Rockies': 'Colorado Rockies',
  'ColoradoRockies': 'Colorado Rockies',
  'Detroit Tigers': 'Detroit Tigers',
  'DetroitTigers': 'Detroit Tigers',
  'Houston Astros': 'Houston Astros',
  'HoustonAstros': 'Houston Astros',
  'Kansas City Royals': 'Kansas City Royals',
  'KansasCityRoyals': 'Kansas City Royals',
  'Los Angeles Angels': 'Los Angeles Angels',
  'LosAngelesAngels': 'Los Angeles Angels',
  'Los Angeles Dodgers': 'Los Angeles Dodgers',
  'LosAngelesDodgers': 'Los Angeles Dodgers',
  'Miami Marlins': 'Miami Marlins',
  'MiamiMarlins': 'Miami Marlins',
  'Milwaukee Brewers': 'Milwaukee Brewers',
  'MilwaukeeBrewers': 'Milwaukee Brewers',
  'Minnesota Twins': 'Minnesota Twins',
  'MinnesotaTwins': 'Minnesota Twins',
  'New York Mets': 'New York Mets',
  'NewYorkMets': 'New York Mets',
  'New York Yankees': 'New York Yankees',
  'NewYorkYankees': 'New York Yankees',
  'Oakland Athletics': 'Oakland Athletics',
  'OaklandAthletics': 'Oakland Athletics',
  'Philadelphia Phillies': 'Philadelphia Phillies',
  'PhiladelphiaPhillies': 'Philadelphia Phillies',
  'Pittsburgh Pirates': 'Pittsburgh Pirates',
  'PittsburghPirates': 'Pittsburgh Pirates',
  'San Diego Padres': 'San Diego Padres',
  'SanDiegoPadres': 'San Diego Padres',
  'San Francisco Giants': 'San Francisco Giants',
  'SanFranciscoGiants': 'San Francisco Giants',
  'Seattle Mariners': 'Seattle Mariners',
  'SeattleMariners': 'Seattle Mariners',
  'St. Louis Cardinals': 'St. Louis Cardinals',
  'St.LouisCardinals': 'St. Louis Cardinals',
  'Tampa Bay Rays': 'Tampa Bay Rays',
  'TampaBayRays': 'Tampa Bay Rays',
  'Texas Rangers': 'Texas Rangers',
  'TexasRangers': 'Texas Rangers',
  'Toronto Blue Jays': 'Toronto Blue Jays',
  'TorontoBlueJays': 'Toronto Blue Jays',
};

function normalizeTeamName(teamName: string): string {
  return TEAM_NAME_MAP[teamName] || teamName;
}

async function updateMLBGames() {
  console.log('Starting MLB games update...');
  
  // Get all MLB games from the database
  const games = await prisma.game.findMany({
    where: {
      sport: 'MLB'
    }
  });
  
  console.log(`Found ${games.length} games to update`);
  
  // Get current date and set to midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const game of games) {
    try {
      let homeTeam: string;
      let awayTeam: string;
      let gameDate: Date;
      
      // Handle different game ID formats
      if (game.id.startsWith('MLB_')) {
        // Format: MLB_{homeTeam}_{awayTeam}_{date}
        const parts = game.id.split('_');
        if (parts.length >= 4) {
          homeTeam = normalizeTeamName(parts[1]);
          awayTeam = normalizeTeamName(parts[2]);
          gameDate = new Date(parts[3]);
        } else {
          console.log(`Skipping game ${game.id} - invalid MLB_ format`);
          skippedCount++;
          continue;
        }
      } else if (game.id.startsWith('mlb-game-')) {
        // Format: mlb-game-{hash}
        // Use the game's stored team names and date
        homeTeam = normalizeTeamName(game.homeTeamName);
        awayTeam = normalizeTeamName(game.awayTeamName);
        gameDate = new Date(game.gameDate);
      } else {
        // Format: just a number
        // Use the game's stored team names and date
        homeTeam = normalizeTeamName(game.homeTeamName);
        awayTeam = normalizeTeamName(game.awayTeamName);
        gameDate = new Date(game.gameDate);
      }
      
      console.log(`Searching for game: ${homeTeam} vs ${awayTeam} on ${gameDate.toISOString().split('T')[0]}`);
      
      // Search for the game in MLB API
      const mlbGames = await MLBStatsService.searchGames(homeTeam, awayTeam, gameDate);
      
      if (mlbGames && mlbGames.length > 0) {
        const mlbGame = mlbGames[0];
        
        // Determine if game should be marked as FINAL
        const isPastGame = gameDate < today;
        const shouldBeFinal = isPastGame || mlbGame.status.abstractGameState === 'Final';
        
        // Update game with new status and scores
        await prisma.game.update({
          where: { id: game.id },
          data: {
            status: shouldBeFinal ? 'FINAL' : game.status,
            homeScore: mlbGame.teams.home.score,
            awayScore: mlbGame.teams.away.score
          }
        });
        
        console.log(`Updated game ${game.id} with scores: ${mlbGame.teams.home.score}-${mlbGame.teams.away.score}`);
        updatedCount++;
      } else if (gameDate < today) {
        // If game is in the past and not found, mark it as FINAL
        await prisma.game.update({
          where: { id: game.id },
          data: {
            status: 'FINAL'
          }
        });
        console.log(`Marked past game ${game.id} as FINAL`);
        updatedCount++;
      } else {
        console.log(`No matching game found for ${game.id}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`Error updating game ${game.id}:`, error);
      errorCount++;
    }
  }
  
  console.log('\nUpdate Summary:');
  console.log(`Total games processed: ${games.length}`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('Finished updating MLB games');
}

// Run the update
updateMLBGames()
  .then(() => {
    console.log('Successfully updated MLB games');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating MLB games:', error);
    process.exit(1);
  }); 