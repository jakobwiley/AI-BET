'use client';

import { useState, useEffect } from 'react';
import { FaUser, FaSpinner, FaStar, FaEdit, FaSignOutAlt } from 'react-icons/fa';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Mock user data - in a real app, you would fetch this from your backend/API
const mockUser = {
  id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  image: 'https://via.placeholder.com/150',
  createdAt: new Date('2023-01-15'),
};

// Mock favorite teams and players
const mockFavorites = {
  teams: [
    { id: 'team1', name: 'Lakers', sport: 'NBA' },
    { id: 'team2', name: 'Yankees', sport: 'MLB' },
  ],
  players: [
    { id: 'player1', name: 'LeBron James', team: 'Lakers', sport: 'NBA' },
    { id: 'player2', name: 'Aaron Judge', team: 'Yankees', sport: 'MLB' },
  ],
};

export default function ProfilePage() {
  const [user, setUser] = useState(mockUser);
  const [favorites, setFavorites] = useState(mockFavorites);
  const [loading, setLoading] = useState(false);

  // In a real app, you would fetch user data and favorites here
  useEffect(() => {
    // Simulate loading
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setUser(mockUser);
      setFavorites(mockFavorites);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-blue-500 mb-4" />
        <p className="text-gray-300">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row md:items-start md:space-x-8">
        <div className="w-full md:w-1/3 bg-gray-800 rounded-xl p-6 mb-6 md:mb-0">
          <div className="flex flex-col items-center">
            {user.image ? (
              <img 
                src={user.image} 
                alt={user.name} 
                className="w-24 h-24 rounded-full mb-4"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                <FaUser className="text-4xl text-gray-400" />
              </div>
            )}
            <h1 className="text-xl font-bold mb-1">{user.name}</h1>
            <p className="text-sm text-gray-400 mb-4">{user.email}</p>
            
            <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center mb-4 w-full justify-center">
              <FaEdit className="mr-2" />
              Edit Profile
            </button>
            
            <button className="text-red-500 hover:text-red-400 py-2 px-4 flex items-center w-full justify-center">
              <FaSignOutAlt className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="w-full md:w-2/3">
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Your Favorites</h2>
              <span className="text-blue-400 text-sm">Manage</span>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium uppercase text-gray-400 mb-3 flex items-center">
                <FaStar className="mr-2 text-yellow-500" />
                Favorite Teams
              </h3>
              
              {favorites.teams.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {favorites.teams.map((team) => (
                    <motion.div 
                      key={team.id}
                      whileHover={{ scale: 1.03 }}
                      className="bg-gray-700 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-xs text-gray-400">{team.sport}</p>
                      </div>
                      <button className="text-red-400 hover:text-red-500">
                        <FaStar />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No favorite teams added yet.</p>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium uppercase text-gray-400 mb-3 flex items-center">
                <FaStar className="mr-2 text-yellow-500" />
                Favorite Players
              </h3>
              
              {favorites.players.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {favorites.players.map((player) => (
                    <motion.div 
                      key={player.id}
                      whileHover={{ scale: 1.03 }}
                      className="bg-gray-700 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-xs text-gray-400">{player.team} • {player.sport}</p>
                      </div>
                      <button className="text-red-400 hover:text-red-500">
                        <FaStar />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No favorite players added yet.</p>
              )}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Betting History</h2>
            <p className="text-gray-400 text-center py-8">
              Your betting history will appear here once you start using your predictions.
            </p>
            <div className="text-center">
              <Link 
                href="/nba" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg inline-block"
              >
                Get Predictions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 