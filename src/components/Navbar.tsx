'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBasketballBall, FaBaseballBall, FaUser, FaBell, FaChartLine } from 'react-icons/fa';

const Navbar = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-100';
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg w-full z-10 fixed bottom-0 md:top-0 md:bottom-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                BetAI
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/nba" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${isActive('/nba')}`}>
              <FaBasketballBall />
              NBA
            </Link>
            <Link href="/mlb" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${isActive('/mlb')}`}>
              <FaBaseballBall />
              MLB
            </Link>
            <Link href="/insights" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${isActive('/insights')}`}>
              <FaChartLine />
              Insights
            </Link>
            <Link href="/profile" className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${isActive('/profile')}`}>
              <FaUser />
              Profile
            </Link>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="md:hidden grid grid-cols-4 gap-1 w-full">
        <Link href="/nba" className={`flex flex-col items-center justify-center py-2 ${isActive('/nba')}`}>
          <FaBasketballBall size={20} />
          <span className="text-xs mt-1">NBA</span>
        </Link>
        <Link href="/mlb" className={`flex flex-col items-center justify-center py-2 ${isActive('/mlb')}`}>
          <FaBaseballBall size={20} />
          <span className="text-xs mt-1">MLB</span>
        </Link>
        <Link href="/insights" className={`flex flex-col items-center justify-center py-2 ${isActive('/insights')}`}>
          <FaChartLine size={20} />
          <span className="text-xs mt-1">Insights</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center justify-center py-2 ${isActive('/profile')}`}>
          <FaUser size={20} />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar; 