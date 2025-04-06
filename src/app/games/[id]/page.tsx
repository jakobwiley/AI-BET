'use client';

import { useState, useEffect } from 'react';
import { FaSpinner, FaBasketballBall, FaBaseballBall, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PredictionCard from '@/components/PredictionCard';
import PlayerPropCard from '@/components/PlayerPropCard';

// Mock NBA games
const mockNBAGames = [
  {
    id: 'nba-game-1',
    sport: 'NBA' as const,
    gameDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
    homeTeamId: 'lakers',
    awayTeamId: 'warriors',
    homeTeamName: 'Lakers',
    awayTeamName: 'Warriors',
    status: 'SCHEDULED',
  }
];

// Mock MLB games
const mockMLBGames = [
  {
    id: 'mlb-game-1',
    sport: 'MLB' as const,
    gameDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
    homeTeamId: 'yankees',
    awayTeamId: 'redsox',
    homeTeamName: 'Yankees',
    awayTeamName: 'Red Sox',
    status: 'SCHEDULED',
  }
];

// Define prediction type
interface Prediction {
  id: string;
  gameId: string;
  predictionType: string;
  predictionValue: string;
  confidence: number;
  reasoning: string;
  createdAt: Date;
}

// Define player prop type
interface PlayerProp {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  propType: string;
  overUnderValue: number;
  predictionValue: string;
  confidence: number;
  reasoning: string;
  outcome?: string;
  createdAt: Date;
}

// Define the type for the mock data objects
interface PredictionsMap {
  [key: string]: Prediction[];
}

interface PlayerPropsMap {
  [key: string]: PlayerProp[];
}

// Mock predictions
const mockPredictions: PredictionsMap = {
  'nba-game-1': [
    {
      id: 'pred-1',
      gameId: 'nba-game-1',
      predictionType: 'SPREAD',
      predictionValue: 'Warriors -5.5',
      confidence: 0.85,
      reasoning: 'The Warriors have covered the spread in 7 of their last 10 away games against the Lakers.',
      createdAt: new Date()
    },
    {
      id: 'pred-2',
      gameId: 'nba-game-1',
      predictionType: 'MONEYLINE',
      predictionValue: 'Warriors Win',
      confidence: 0.75,
      reasoning: 'The Warriors have a strong historical advantage over the Lakers this season with a 3-0 record in their previous matchups.',
      createdAt: new Date()
    },
    {
      id: 'pred-3',
      gameId: 'nba-game-1',
      predictionType: 'OVER_UNDER',
      predictionValue: 'OVER 225.5',
      confidence: 0.68,
      reasoning: 'Both teams have been scoring above their season average in recent games. The last 5 matchups between these teams have averaged 232 points.',
      createdAt: new Date()
    }
  ],
  'mlb-game-1': [
    {
      id: 'pred-4',
      gameId: 'mlb-game-1',
      predictionType: 'MONEYLINE',
      predictionValue: 'Yankees Win',
      confidence: 0.76,
      reasoning: 'The Yankees have won 7 of their last 10 home games against the Red Sox and have their ace pitcher starting tonight.',
      createdAt: new Date()
    },
    {
      id: 'pred-5',
      gameId: 'mlb-game-1',
      predictionType: 'OVER_UNDER',
      predictionValue: 'OVER 8.5',
      confidence: 0.68,
      reasoning: 'Both teams have strong offensive lineups and the weather conditions at Yankee Stadium favor hitting with a 10mph wind blowing out to right field.',
      createdAt: new Date()
    }
  ]
};

// Mock player props
const mockPlayerProps: PlayerPropsMap = {
  'nba-game-1': [
    {
      id: 'prop-1',
      gameId: 'nba-game-1',
      playerId: 'player1',
      playerName: 'Stephen Curry',
      teamId: 'warriors',
      propType: 'POINTS',
      overUnderValue: 28.5,
      predictionValue: 'OVER',
      confidence: 0.82,
      reasoning: 'Curry has averaged 32.4 points in his last 5 games against the Lakers and is coming off a 40-point performance.',
      createdAt: new Date()
    },
    {
      id: 'prop-2',
      gameId: 'nba-game-1',
      playerId: 'player2',
      playerName: 'LeBron James',
      teamId: 'lakers',
      propType: 'ASSISTS',
      overUnderValue: 8.5,
      predictionValue: 'OVER',
      confidence: 0.75,
      reasoning: 'James has recorded 9+ assists in 6 of his last 8 games, taking on more of a facilitator role recently.',
      createdAt: new Date()
    },
    {
      id: 'prop-3',
      gameId: 'nba-game-1',
      playerId: 'player3',
      playerName: 'Anthony Davis',
      teamId: 'lakers',
      propType: 'REBOUNDS',
      overUnderValue: 11.5,
      predictionValue: 'UNDER',
      confidence: 0.68,
      reasoning: 'Davis has averaged just 9.3 rebounds against the Warriors this season as they employ a small-ball lineup that pulls him away from the basket.',
      createdAt: new Date()
    }
  ],
  'mlb-game-1': [
    {
      id: 'prop-4',
      gameId: 'mlb-game-1',
      playerId: 'player4',
      playerName: 'Aaron Judge',
      teamId: 'yankees',
      propType: 'HOME_RUNS',
      overUnderValue: 0.5,
      predictionValue: 'OVER',
      confidence: 0.65,
      reasoning: 'Judge has hit home runs in 4 of his last 7 games against the Red Sox and has favorable matchup against their starting pitcher.',
      createdAt: new Date()
    },
    {
      id: 'prop-5',
      gameId: 'mlb-game-1',
      playerId: 'player5',
      playerName: 'Rafael Devers',
      teamId: 'redsox',
      propType: 'HITS',
      overUnderValue: 1.5,
      predictionValue: 'OVER',
      confidence: 0.72,
      reasoning: 'Devers has recorded multiple hits in 6 of his last 10 games at Yankee Stadium and is batting .345 in the last 15 days.',
      createdAt: new Date()
    }
  ]
};

// Define game type
interface Game {
  id: string;
  sport: 'NBA' | 'MLB';
  gameDate: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  status: string;
}

export default function GamePage({ params }: { params: { id: string } }) {
  const [game, setGame] = useState<Game | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'predictions' | 'playerProps'>('predictions');

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        setLoading(true);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find the game from our mock data
        const allGames = [...mockNBAGames, ...mockMLBGames];
        const foundGame = allGames.find(g => g.id === params.id);
        
        if (!foundGame) {
          throw new Error('Game not found');
        }
        
        setGame(foundGame);
        setPredictions(mockPredictions[params.id] || []);
        setPlayerProps(mockPlayerProps[params.id] || []);
        
      } catch (err) {
        setError('Failed to fetch game details');
      } finally {
        setLoading(false);
      }
    };

    fetchGameDetails();
  }, [params.id]);

  // Format date
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
        <p className="text-gray-300">Loading game details...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Game</h1>
        <p className="text-gray-300 mb-4">{error || 'Game not found'}</p>
        <Link 
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
        >
          <FaArrowLeft className="mr-2" />
          Back to Home
        </Link>
      </div>
    );
  }

  // Get the appropriate sport icon
  const SportIcon = game.sport === 'NBA' ? FaBasketballBall : FaBaseballBall;

  return (
    <div className="py-8">
      <Link 
        href={`/${game.sport.toLowerCase()}`}
        className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6"
      >
        <FaArrowLeft className="mr-2" />
        Back to {game.sport} Games
      </Link>
      
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl mb-8">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <SportIcon className="text-blue-500 mr-2 text-xl" />
            <span className="text-gray-400">
              {formatDate(game.gameDate)}
            </span>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{game.homeTeamName}</h2>
              <p className="text-gray-400 text-sm">Home</p>
            </div>
            
            <div className="flex flex-col items-center px-6">
              <p className="text-gray-500 font-bold text-lg md:text-xl">vs</p>
              <p className="text-sm text-gray-500 rounded-full px-2 py-1 bg-gray-700 mt-1">
                {game.status}
              </p>
            </div>
            
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{game.awayTeamName}</h2>
              <p className="text-gray-400 text-sm">Away</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b border-gray-700">
          <button
            className={`py-3 px-6 text-sm font-medium ${
              activeTab === 'predictions' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('predictions')}
          >
            Game Predictions
          </button>
          <button
            className={`py-3 px-6 text-sm font-medium ${
              activeTab === 'playerProps' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('playerProps')}
          >
            Player Props
          </button>
        </div>
      </div>
      
      {activeTab === 'predictions' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-bold mb-4">Game Predictions</h2>
          
          {predictions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {predictions.map((prediction) => (
                <PredictionCard key={prediction.id} prediction={prediction} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-800 rounded-xl">
              <p className="text-gray-300">No predictions available for this game yet.</p>
            </div>
          )}
        </motion.div>
      )}
      
      {activeTab === 'playerProps' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-bold mb-4">Player Props</h2>
          
          {playerProps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {playerProps.map((prop) => (
                <PlayerPropCard key={prop.id} playerProp={prop} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-800 rounded-xl">
              <p className="text-gray-300">No player props available for this game yet.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
} 