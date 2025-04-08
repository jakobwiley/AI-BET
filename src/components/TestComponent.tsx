'use client';

import { useState, useEffect } from 'react';

export function TestComponent() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('TestComponent mounted');
  }, []);
  
  return (
    <div>
      <h1>Test Component</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
} 