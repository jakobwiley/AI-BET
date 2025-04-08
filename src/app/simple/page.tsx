import React from 'react';

export default function SimplePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Simple Page</h1>
      <p className="mb-4">This is a simple server component page with no client-side hooks or components.</p>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-2">NBA Games</h2>
        <p>Real NBA games would be shown here.</p>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg mt-6">
        <h2 className="text-xl font-bold mb-2">MLB Games</h2>
        <p>Real MLB games would be shown here.</p>
      </div>
    </div>
  );
} 