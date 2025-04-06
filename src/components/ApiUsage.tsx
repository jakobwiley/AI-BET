'use client';

import React, { useState } from 'react';
import { OddsApiService } from '@/lib/oddsApi';
import type { ApiUsage as ApiUsageType } from '@/lib/oddsApi';
import { CacheService } from '@/lib/cacheService';

interface ApiUsageProps {
  className?: string;
}

export function ApiUsage({ className = '' }: ApiUsageProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [stats, setStats] = useState<ApiUsageType>({
    used: 0,
    limit: 500,
    lastResetDate: new Date()
  });

  // Only check API key and stats when the component mounts
  React.useEffect(() => {
    async function checkApiKey() {
      const isValid = await OddsApiService.testApiKey();
      setApiKeyValid(isValid);
      if (isValid) {
        setStats(OddsApiService.getApiUsageStats());
      }
    }
    checkApiKey();
  }, []);

  const usagePercentage = (stats.used / stats.limit) * 100;
  const usageColor = usagePercentage > 90 ? 'text-red-500' : usagePercentage > 75 ? 'text-yellow-500' : 'text-green-500';

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setMessage('Refreshing data...');
      OddsApiService.clearCache();
      CacheService.getInstance().clearSportsData();
      setMessage('Data refreshed successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage('Failed to refresh data. Please try again.');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const formatResetDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNextResetDate = () => {
    const now = new Date();
    const resetDate = new Date(now);
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);
    return resetDate;
  };

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">API Usage</h3>
        <div className={`text-sm ${apiKeyValid === null ? 'text-gray-500' : apiKeyValid ? 'text-green-500' : 'text-red-500'}`}>
          {apiKeyValid === null ? 'Checking API key...' : apiKeyValid ? 'API Key: Valid' : 'API Key: Invalid'}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Used:</span>
          <span className={usageColor}>{stats.used} / {stats.limit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Resets on {formatResetDate(getNextResetDate())}
      </div>

      {message && (
        <div className="text-sm text-center text-gray-600">
          {message}
        </div>
      )}

      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
          refreshing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {refreshing ? 'Refreshing...' : 'Refresh Data'}
      </button>
    </div>
  );
} 