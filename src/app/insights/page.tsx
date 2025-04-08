'use client';

import React, { useState, useEffect } from 'react';
import { FaChartLine, FaLightbulb, FaSpinner } from 'react-icons/fa';
import { useUpcomingGames } from '@/hooks/useSportsData';
import { SportType } from '@/models/types';

export default function InsightsPage() {
  const [activeSport, setActiveSport] = useState<SportType>('NBA');
  const { games, loading, error } = useUpcomingGames(activeSport);
  
  // Calculate insights based on games data
  const insights = React.useMemo(() => {
    if (!games || games.length === 0) return [];
    
    const predictions = games.flatMap(game => game.predictions || []);
    
    // Group predictions by type
    const spreadPredictions = predictions.filter(p => p.predictionType === 'SPREAD');
    const moneylinePredictions = predictions.filter(p => p.predictionType === 'MONEYLINE');
    const totalPredictions = predictions.filter(p => p.predictionType === 'TOTAL');
    
    // Calculate average confidence by prediction type
    const avgSpreadConfidence = spreadPredictions.length > 0 
      ? spreadPredictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / spreadPredictions.length 
      : 0;
    
    const avgMoneylineConfidence = moneylinePredictions.length > 0 
      ? moneylinePredictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / moneylinePredictions.length 
      : 0;
    
    const avgTotalConfidence = totalPredictions.length > 0 
      ? totalPredictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / totalPredictions.length 
      : 0;
    
    // Find highest confidence predictions
    const highestConfidencePredictions = [...predictions]
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 5);
    
    return [
      {
        id: 'avg-confidence',
        title: 'Average Prediction Confidence',
        description: `The average confidence level for all predictions is ${((avgSpreadConfidence + avgMoneylineConfidence + avgTotalConfidence) / 3).toFixed(1)}%`,
        icon: <FaChartLine className="text-blue-500" />,
        value: `${((avgSpreadConfidence + avgMoneylineConfidence + avgTotalConfidence) / 3).toFixed(1)}%`
      },
      {
        id: 'highest-confidence',
        title: 'Highest Confidence Predictions',
        description: `There are ${highestConfidencePredictions.length} predictions with confidence above 80%`,
        icon: <FaLightbulb className="text-yellow-500" />,
        value: highestConfidencePredictions.length.toString()
      },
      {
        id: 'prediction-types',
        title: 'Prediction Types',
        description: `Spread: ${avgSpreadConfidence.toFixed(1)}%, Moneyline: ${avgMoneylineConfidence.toFixed(1)}%, Total: ${avgTotalConfidence.toFixed(1)}%`,
        icon: <FaChartLine className="text-green-500" />,
        value: `${predictions.length} total`
      }
    ];
  }, [games]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-3xl text-blue-500 mr-3" />
        <span className="text-xl">Loading insights...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Betting Insights</h1>
      
      <div className="mb-8">
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeSport === 'NBA'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setActiveSport('NBA')}
          >
            NBA
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeSport === 'MLB'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setActiveSport('MLB')}
          >
            MLB
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map(insight => (
          <div key={insight.id} className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">{insight.icon}</div>
              <h2 className="text-xl font-bold">{insight.title}</h2>
            </div>
            <p className="text-gray-600 mb-4">{insight.description}</p>
            <div className="text-2xl font-bold text-blue-500">{insight.value}</div>
          </div>
        ))}
      </div>
      
      {insights.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-300">No insights available yet. Check back after more games are played.</p>
        </div>
      )}
    </div>
  );
} 