'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaBasketballBall, FaBaseballBall, FaChartLine } from 'react-icons/fa';

const Navbar = () => {
  const pathname = usePathname();
  
  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      {/* Desktop Navigation */}
      <div className="hidden md:flex justify-between items-center px-4 py-4 max-w-7xl mx-auto">
        <Link href="/" className="text-white text-xl font-bold">
          BetAI
        </Link>
        
        <div className="flex space-x-6">
          <Link 
            href="/" 
            className={`flex items-center ${
              isActive('/') 
                ? 'text-blue-500' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FaHome className="mr-2" />
            Home
          </Link>
          
          <Link 
            href="/nba" 
            className={`flex items-center ${
              isActive('/nba') 
                ? 'text-blue-500' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FaBasketballBall className="mr-2" />
            NBA
          </Link>
          
          <Link 
            href="/mlb" 
            className={`flex items-center ${
              isActive('/mlb') 
                ? 'text-blue-500' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FaBaseballBall className="mr-2" />
            MLB
          </Link>
          
          <Link 
            href="/props" 
            className={`flex items-center ${
              isActive('/props') 
                ? 'text-blue-500' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FaChartLine className="mr-2" />
            Props
          </Link>
          
          <Link 
            href="/insights" 
            className={`flex items-center ${
              isActive('/insights') 
                ? 'text-blue-500' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <FaChartLine className="mr-2" />
            Insights
          </Link>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="grid grid-cols-5 h-16">
          <Link 
            href="/" 
            className={`flex flex-col items-center justify-center ${
              isActive('/') 
                ? 'text-blue-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaHome className="text-xl" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link 
            href="/nba" 
            className={`flex flex-col items-center justify-center ${
              isActive('/nba') 
                ? 'text-blue-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaBasketballBall className="text-xl" />
            <span className="text-xs mt-1">NBA</span>
          </Link>
          
          <Link 
            href="/mlb" 
            className={`flex flex-col items-center justify-center ${
              isActive('/mlb') 
                ? 'text-blue-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaBaseballBall className="text-xl" />
            <span className="text-xs mt-1">MLB</span>
          </Link>
          
          <Link 
            href="/props" 
            className={`flex flex-col items-center justify-center ${
              isActive('/props') 
                ? 'text-blue-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaChartLine className="text-xl" />
            <span className="text-xs mt-1">Props</span>
          </Link>
          
          <Link 
            href="/insights" 
            className={`flex flex-col items-center justify-center ${
              isActive('/insights') 
                ? 'text-blue-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaChartLine className="text-xl" />
            <span className="text-xs mt-1">Insights</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 