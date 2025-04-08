'use client';

import React from 'react';
import ApiUsage from './ApiUsage';

interface ApiUsageWrapperProps {
  className?: string;
}

export default function ApiUsageWrapper({ className = 'fixed bottom-0 right-0 w-64 bg-gray-900 bg-opacity-80 backdrop-blur-md text-white border-l border-t border-gray-700 rounded-tl-lg z-50' }: ApiUsageWrapperProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={className}>
      <button 
        onClick={toggleExpanded}
        className="w-full p-2 text-left font-medium flex justify-between items-center hover:bg-gray-800"
      >
        API Usage
        <span className="text-xs">{isExpanded ? '▼' : '▲'}</span>
      </button>
      {isExpanded && <ApiUsage />}
    </div>
  );
} 