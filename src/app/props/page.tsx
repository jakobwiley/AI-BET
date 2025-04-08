'use client';

import { useState, useEffect } from 'react';
import { FaBasketballBall, FaBaseballBall } from 'react-icons/fa';
import { PlayerPropsService } from '@/lib/playerProps';
import { SportType } from '@/models/types';
import PlayerPropCard from '@/components/PlayerPropCard';

export default function PropsPage() {
  const [activeSport, setActiveSport] = useState<SportType>('NBA');
  const [loading, setLoading] = useState(true);
  const [props, setProps] = useState<any[]>([]);

  // Function to fetch props for the active sport
  const fetchProps = async (sport: SportType) => {
    setLoading(true);
    const service = new PlayerPropsService();
    const props = await service.getPopularPlayerProps(sport);
    setProps(props);
    setLoading(false);
  };

  // Fetch props when sport changes
  useEffect(() => {
    fetchProps(activeSport);
  }, [activeSport]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Player Props</h1>
      
      {/* Sport Selection Tabs */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveSport('NBA')}
          className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
            activeSport === 'NBA'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <FaBasketballBall className="mr-2" />
          NBA
        </button>
        <button
          onClick={() => setActiveSport('MLB')}
          className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
            activeSport === 'MLB'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <FaBaseballBall className="mr-2" />
          MLB
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Props Display */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {props.map((prop) => (
            <PlayerPropCard key={prop.id} playerProp={prop} />
          ))}
          {props.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-800 rounded-lg">
              <p className="text-gray-300">No player props available for {activeSport} at the moment.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 