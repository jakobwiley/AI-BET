'use client';

import React from 'react';
import { ComponentTester, createNbaGame, createMlbGame } from './test-helper';
import GameCard from '@/components/GameCard';
import GameDetails from '@/components/GameDetails';

export default function TestComponentsPage() {
  const nbaGame = createNbaGame();
  const mlbGame = createMlbGame();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Component Testing Page</h1>
      
      {/* Automated tests section */}
      <ComponentTester />
      
      {/* Visual testing section */}
      <div>
        <h2 className="text-2xl font-bold my-4">Visual Tests</h2>
        
        <div className="space-y-12">
          <section>
            <h3 className="text-xl font-semibold border-b pb-2 mb-4">NBA Components</h3>
            
            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-medium mb-4">NBA GameCard</h4>
                <div className="max-w-md">
                  <GameCard 
                    game={nbaGame} 
                    predictions={nbaGame.predictions} 
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-4">NBA GameDetails</h4>
                <GameDetails 
                  game={nbaGame} 
                  initialPredictions={nbaGame.predictions || []} 
                  initialPlayerProps={[]} 
                />
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold border-b pb-2 mb-4">MLB Components</h3>
            
            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-medium mb-4">MLB GameCard</h4>
                <div className="max-w-md">
                  <GameCard 
                    game={mlbGame} 
                    predictions={mlbGame.predictions} 
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-4">MLB GameDetails</h4>
                <GameDetails 
                  game={mlbGame} 
                  initialPredictions={mlbGame.predictions || []} 
                  initialPlayerProps={[]} 
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
} 