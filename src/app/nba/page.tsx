'use client';

import { FaSpinner, FaFilter, FaSortAmountDown } from "react-icons/fa";
import { useUpcomingGames } from '@/hooks/useSportsData';
import { GameList } from '@/components/GameList';

export default function NBAPage() {
  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">NBA Predictions</h1>
        
        <div className="flex space-x-2">
          <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-lg flex items-center">
            <FaFilter className="mr-2" />
            Filter
          </button>
          <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded-lg flex items-center">
            <FaSortAmountDown className="mr-2" />
            Sort
          </button>
        </div>
      </div>

      <GameList sport="NBA" />
    </div>
  );
} 