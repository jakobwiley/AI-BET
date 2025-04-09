#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Running fetch-initial-data.ts with proper module resolution...');

try {
  // Run the TypeScript script using ts-node with the script-specific tsconfig
  execSync('npx ts-node --project scripts/tsconfig.json scripts/fetch-initial-data.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure NBA API settings are available
      NBA_API_URL: process.env.NBA_API_URL || 'http://localhost:5000',
      NEXT_PUBLIC_USE_NEW_NBA_API: 'true',
      USE_BALLDONTLIE_FALLBACK: 'true'
    }
  });
  
  console.log('✅ Initial data fetch completed successfully!');
} catch (error) {
  console.error('❌ Error running fetch-initial-data.ts:', error.message);
  process.exit(1);
} 