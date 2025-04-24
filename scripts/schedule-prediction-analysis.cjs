const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Schedule analysis to run daily at 00:05 AM
cron.schedule('5 0 * * *', async () => {
  console.log('Starting daily prediction analysis...');
  
  try {
    // Run the analysis script
    await new Promise((resolve, reject) => {
      exec('npx ts-node scripts/automated-prediction-analysis.ts', (error, stdout, stderr) => {
        if (error) {
          console.error('Error running analysis:', error);
          reject(error);
          return;
        }
        console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      });
    });

    // Check for high-risk predictions and send notifications
    const today = new Date().toISOString().split('T')[0];
    const reportPath = path.join(process.cwd(), 'reports', `prediction-analysis-${today}.json`);
    
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    
    if (report.recommendations.highRiskPredictions.length > 0) {
      console.log('\nHigh Risk Predictions Found:');
      report.recommendations.highRiskPredictions.forEach(pred => {
        console.log(`- ${pred.type} prediction (${pred.value}): ${pred.warning}`);
      });
    }

    if (report.recommendations.valueBets.length > 0) {
      console.log('\nValue Betting Opportunities:');
      report.recommendations.valueBets.forEach(bet => {
        console.log(`- ${bet.type} bet (${bet.value}): Expected value ${bet.expectedValue.toFixed(1)}%`);
      });
    }

    // Log completion
    console.log('\nDaily analysis completed successfully');
    
  } catch (error) {
    console.error('Failed to complete daily analysis:', error);
  }
});

// Also run analysis immediately when script starts
console.log('Running initial analysis...');
exec('npx ts-node scripts/automated-prediction-analysis.ts', (error, stdout, stderr) => {
  if (error) {
    console.error('Error running initial analysis:', error);
    return;
  }
  console.log(stdout);
  if (stderr) console.error(stderr);
}); 