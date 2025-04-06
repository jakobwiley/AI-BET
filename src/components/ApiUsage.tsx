import React, { useState } from 'react';
import { useApiUsage } from '@/hooks/useSportsData';

interface ApiUsageProps {
  className?: string;
}

const ApiUsage: React.FC<ApiUsageProps> = ({ className = '' }) => {
  const { usageStats, remainingCalls, refreshAllData } = useApiUsage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Calculate usage percentage
  const monthlyLimit = 500;
  const usagePercentage = (usageStats.totalCalls / monthlyLimit) * 100;
  const usageColor = 
    usagePercentage < 30 ? 'bg-green-500' :
    usagePercentage < 70 ? 'bg-yellow-500' :
    'bg-red-500';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    
    try {
      const success = await refreshAllData();
      if (success) {
        setRefreshMessage('Data refreshed successfully.');
      } else {
        setRefreshMessage('Failed to refresh data. Try again later.');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setRefreshMessage('Error refreshing data. Check console for details.');
    } finally {
      setIsRefreshing(false);
      // Clear message after 3 seconds
      setTimeout(() => setRefreshMessage(null), 3000);
    }
  };

  // Format the last reset date
  const formatResetDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Unknown';
    }
  };

  // Calculate next reset date (1st of next month)
  const getNextResetDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString();
  };

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <h2 className="text-lg font-semibold mb-2">API Usage</h2>
      
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">Monthly usage (limit: {monthlyLimit})</span>
          <span className="text-sm font-medium">{usageStats.totalCalls} calls</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${usageColor}`} 
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div>
          <div className="text-gray-500">Remaining calls</div>
          <div className="font-medium">{remainingCalls}</div>
        </div>
        <div>
          <div className="text-gray-500">Last reset</div>
          <div className="font-medium">{formatResetDate(usageStats.lastResetDate)}</div>
        </div>
        <div>
          <div className="text-gray-500">Next reset</div>
          <div className="font-medium">{getNextResetDate()}</div>
        </div>
        <div>
          <div className="text-gray-500">Cache status</div>
          <div className="font-medium">
            {remainingCalls > 0 ? 'Active' : 'Fallback only'}
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || remainingCalls === 0}
          className={`w-full px-4 py-2 text-white font-medium rounded-md 
            ${isRefreshing || remainingCalls === 0 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isRefreshing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </span>
          ) : remainingCalls === 0 ? (
            'Limit reached'
          ) : (
            'Refresh data'
          )}
        </button>
        
        {refreshMessage && (
          <div className={`mt-2 text-sm text-center ${
            refreshMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'
          }`}>
            {refreshMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiUsage; 