#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get the absolute path to the generate-picks.js script
const scriptPath = path.resolve(__dirname, 'src/scripts/generate-picks.js');

// Make sure the script exists
if (!fs.existsSync(scriptPath)) {
  console.error('Error: generate-picks.js script not found at', scriptPath);
  process.exit(1);
}

// Make the script executable
try {
  execSync(`chmod +x ${scriptPath}`);
} catch (error) {
  console.error('Error making script executable:', error.message);
  process.exit(1);
}

// Prompt for email and time
rl.question('Enter your email address: ', (email) => {
  rl.question('Enter the time to run the script (24-hour format, HH:MM): ', (time) => {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      console.error('Invalid time format. Please use 24-hour format (HH:MM)');
      rl.close();
      process.exit(1);
    }

    // Parse hours and minutes
    const [hours, minutes] = time.split(':').map(Number);

    // Create cron line
    const cronLine = `${minutes} ${hours} * * * ${scriptPath} > /dev/null 2>&1`;

    try {
      // Get current crontab
      let currentCrontab = '';
      try {
        currentCrontab = execSync('crontab -l').toString();
      } catch (error) {
        // No existing crontab, that's okay
      }

      // Check if our script is already in the crontab
      const lines = currentCrontab.split('\n').filter(line => line.trim());
      const existingIndex = lines.findIndex(line => line.includes(scriptPath));

      let newCrontab;
      if (existingIndex >= 0) {
        // Update existing entry
        lines[existingIndex] = cronLine;
        newCrontab = lines.join('\n');
      } else {
        // Add new entry
        newCrontab = currentCrontab ? `${currentCrontab}\n${cronLine}` : cronLine;
      }

      // Write to temporary file
      const tempFile = '/tmp/new-crontab';
      fs.writeFileSync(tempFile, newCrontab);

      // Install new crontab
      execSync(`crontab ${tempFile}`);

      // Clean up
      fs.unlinkSync(tempFile);

      console.log('\nCron job installed successfully!');
      console.log(`Daily picks will be generated at ${time} every day.`);
      console.log('\nTo test the script immediately, run:');
      console.log(`node ${scriptPath}`);
    } catch (error) {
      console.error('Error installing cron job:', error.message);
    }

    rl.close();
  });
}); 