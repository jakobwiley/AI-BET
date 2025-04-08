'use client';

import React, { useEffect, useState } from 'react';
import GameCard from '@/components/GameCard';
import GameDetails from '@/components/GameDetails';
import { Game, Prediction, PlayerProp } from '@/models/types';
import { v4 as uuidv4 } from 'uuid';

// Create sample NBA game data
export const createNbaGame = (): Game => ({
  id: 'test-nba-1',
  sport: 'NBA',
  homeTeamId: 'lakers',
  awayTeamId: 'celtics',
  homeTeamName: 'Los Angeles Lakers',
  awayTeamName: 'Boston Celtics',
  startTime: new Date().toISOString(),
  gameDate: new Date().toISOString(),
  status: 'Scheduled',
  homeTeamLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/lakers.png',
  awayTeamLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/celtics.png',
  spread: {
    home: -5.5,
    away: 5.5
  },
  moneyline: {
    home: -180,
    away: 150
  },
  total: 220.5,
  predictions: [
    {
      id: uuidv4(),
      gameId: 'test-nba-1',
      predictionType: 'MONEYLINE',
      predictionValue: 'Los Angeles Lakers',
      confidence: 75,
      reasoning: 'Lakers are favored at home',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      gameId: 'test-nba-1',
      predictionType: 'SPREAD',
      predictionValue: 'Boston Celtics',
      confidence: 65,
      reasoning: 'Celtics are expected to cover the spread',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      gameId: 'test-nba-1',
      predictionType: 'TOTAL',
      predictionValue: 'over',
      confidence: 80,
      reasoning: 'Both teams have strong offenses',
      createdAt: new Date().toISOString()
    }
  ]
});

// Create sample MLB game data
export const createMlbGame = (): Game => ({
  id: 'test-mlb-1',
  sport: 'MLB',
  homeTeamId: 'nyy',
  awayTeamId: 'bos',
  homeTeamName: 'New York Yankees',
  awayTeamName: 'Boston Red Sox',
  startTime: new Date().toISOString(),
  gameDate: new Date().toISOString(),
  status: 'Scheduled',
  homeTeamLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png',
  awayTeamLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png',
  spread: {
    home: -1.5,
    away: 1.5
  },
  moneyline: {
    home: -140,
    away: 120
  },
  total: 8.5,
  predictions: [
    {
      id: uuidv4(),
      gameId: 'test-mlb-1',
      predictionType: 'MONEYLINE',
      predictionValue: 'New York Yankees',
      confidence: 70,
      reasoning: 'Yankees are favored at home',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      gameId: 'test-mlb-1',
      predictionType: 'SPREAD',
      predictionValue: 'Boston Red Sox',
      confidence: 60,
      reasoning: 'Red Sox are expected to keep it close',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      gameId: 'test-mlb-1',
      predictionType: 'TOTAL',
      predictionValue: 'under',
      confidence: 65,
      reasoning: 'Good pitching matchup expected',
      createdAt: new Date().toISOString()
    }
  ]
});

// Create mock player props
export const createMockPlayerProps = (game: Game): PlayerProp[] => [
  {
    id: '1',
    gameId: game.id,
    playerId: '1',
    playerName: `${game.sport === 'NBA' ? 'LeBron James' : 'Aaron Judge'}`,
    teamId: game.homeTeamId,
    teamName: game.homeTeamName,
    propType: game.sport === 'NBA' ? 'POINTS' : 'HITS',
    overUnder: 'OVER',
    line: game.sport === 'NBA' ? 27.5 : 1.5,
    odds: -110,
    confidence: 75,
    prediction: game.sport === 'NBA' ? 30 : 2,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    gameId: game.id,
    playerId: '2',
    playerName: `${game.sport === 'NBA' ? 'Jayson Tatum' : 'Rafael Devers'}`,
    teamId: game.awayTeamId,
    teamName: game.awayTeamName,
    propType: game.sport === 'NBA' ? 'REBOUNDS' : 'RUNS',
    overUnder: 'UNDER',
    line: game.sport === 'NBA' ? 8.5 : 0.5,
    odds: -105,
    confidence: 65,
    prediction: game.sport === 'NBA' ? 7 : 0,
    createdAt: new Date().toISOString()
  }
];

// Component to run simple visual component tests
export function ComponentTester() {
  const [results, setResults] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const runTests = () => {
      const testResults: Record<string, boolean> = {};
      
      // Create test data
      const nbaGame = createNbaGame();
      const mlbGame = createMlbGame();
      
      // DOM tests for NBA GameCard
      try {
        const element = document.getElementById('nba-game-card');
        if (element) {
          const content = element.innerHTML;
          
          testResults['NBA GameCard - Team Names'] = content.includes('Los Angeles Lakers') && 
                                                   content.includes('Boston Celtics');
          testResults['NBA GameCard - Money Line'] = content.includes('Money Line');
          testResults['NBA GameCard - Spread'] = content.includes('Spread');
          testResults['NBA GameCard - Over/Under'] = content.includes('Over/Under');
          testResults['NBA GameCard - Confidence Grade'] = /[A-F]\s+\(\d+%\)/.test(content);
        }
      } catch (error) {
        console.error('NBA GameCard test error:', error);
      }
      
      // DOM tests for MLB GameCard
      try {
        const element = document.getElementById('mlb-game-card');
        if (element) {
          const content = element.innerHTML;
          
          testResults['MLB GameCard - Team Names'] = content.includes('New York Yankees') && 
                                                   content.includes('Boston Red Sox');
          testResults['MLB GameCard - Money Line'] = content.includes('Money Line');
          testResults['MLB GameCard - Total'] = content.includes('Under') || content.includes('Over');
        }
      } catch (error) {
        console.error('MLB GameCard test error:', error);
      }
      
      // DOM tests for NBA GameDetails
      try {
        const element = document.getElementById('nba-game-details');
        if (element) {
          const content = element.innerHTML;
          
          testResults['NBA GameDetails - Game Odds Section'] = content.includes('Game Odds & Predictions');
          testResults['NBA GameDetails - Money Line Column'] = content.includes('Money Line');
          testResults['NBA GameDetails - Odds Values'] = content.includes('-180') && 
                                                      content.includes('150');
        }
      } catch (error) {
        console.error('NBA GameDetails test error:', error);
      }
      
      // DOM tests for MLB GameDetails
      try {
        const element = document.getElementById('mlb-game-details');
        if (element) {
          const content = element.innerHTML;
          
          testResults['MLB GameDetails - Game Odds Section'] = content.includes('Game Odds & Predictions');
          testResults['MLB GameDetails - Total Column'] = content.includes('Total (Over/Under)');
          testResults['MLB GameDetails - MLB Total Value'] = content.includes('8.5');
        }
      } catch (error) {
        console.error('MLB GameDetails test error:', error);
      }
      
      // Set the results
      setResults(testResults);
    };
    
    // Run the tests after components have rendered
    setTimeout(runTests, 500);
  }, []);
  
  // Calculate test summary
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passPercentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Component Test Results</h2>
      
      <div className="p-4 bg-gray-800 rounded-lg mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-md font-bold">Total Tests: </span>
            <span className="text-md">{totalTests}</span>
          </div>
          <div>
            <span className="text-md font-bold">Passed: </span>
            <span className={`text-md ${passPercentage === 100 ? 'text-green-500' : 'text-yellow-500'}`}>
              {passedTests} / {totalTests} ({passPercentage}%)
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          {Object.entries(results).map(([testName, passed]) => (
            <div key={testName} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full ${passed ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`${passed ? 'text-green-100' : 'text-red-100'}`}>{testName}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div id="nba-game-card" className="hidden">
        <GameCard game={createNbaGame()} predictions={createNbaGame().predictions} />
      </div>
      
      <div id="mlb-game-card" className="hidden">
        <GameCard game={createMlbGame()} predictions={createMlbGame().predictions} />
      </div>
      
      <div id="nba-game-details" className="hidden">
        <GameDetails 
          game={createNbaGame()} 
          initialPredictions={createNbaGame().predictions || []} 
          initialPlayerProps={createMockPlayerProps(createNbaGame())} 
        />
      </div>
      
      <div id="mlb-game-details" className="hidden">
        <GameDetails 
          game={createMlbGame()} 
          initialPredictions={createMlbGame().predictions || []} 
          initialPlayerProps={createMockPlayerProps(createMlbGame())} 
        />
      </div>
    </div>
  );
} 