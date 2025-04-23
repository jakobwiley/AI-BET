#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Get project directory
const projectDir = __dirname;
const dailyPicksPath = path.join(projectDir, 'daily-picks.js');
const emailScriptPath = path.join(projectDir, 'send-picks-email.js');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for email and time
rl.question('Enter your email to receive daily picks (leave blank to skip): ', (email) => {
  rl.question('Enter time to run predictions daily (HH:MM in 24-hour format): ', (time) => {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      console.error('Invalid time format. Please use HH:MM in 24-hour format.');
      rl.close();
      return;
    }

    // Split time into hours and minutes for cron
    const [hours, minutes] = time.split(':');
    
    // Generate cron line
    let cronLine = `${minutes} ${hours} * * * cd ${projectDir} && /usr/local/bin/node ${dailyPicksPath}`;
    
    // Add email command if email provided
    if (email && email.trim() !== '') {
      cronLine += ` && /usr/local/bin/node ${emailScriptPath} "${email.trim()}"`;
    }
    
    // Make scripts executable
    try {
      // Create daily-picks.js if it doesn't exist
      if (!fs.existsSync(dailyPicksPath)) {
        fs.writeFileSync(dailyPicksPath, `#!/usr/bin/env node
console.log('Running daily predictions at ${new Date().toISOString()}');
// Add your prediction logic here
`);
      }
      
      // Create email script if it doesn't exist and email is provided
      if (email && email.trim() !== '' && !fs.existsSync(emailScriptPath)) {
        fs.writeFileSync(emailScriptPath, `#!/usr/bin/env node
const email = process.argv[2];
console.log(\`Sending daily picks to \${email}\`);
// Add your email sending logic here
`);
      }
      
      // Make scripts executable
      execSync(`chmod +x ${dailyPicksPath}`);
      if (email && email.trim() !== '') {
        execSync(`chmod +x ${emailScriptPath}`);
      }
      
      console.log('Scripts created and made executable');
    } catch (error) {
      console.error('Error making scripts executable:', error.message);
    }
    
    // Install cron job
    try {
      // Get current crontab
      let currentCrontab = '';
      try {
        currentCrontab = execSync('crontab -l').toString();
      } catch (error) {
        // It's okay if there's no crontab yet
      }
      
      // Check if job already exists
      if (currentCrontab.includes(dailyPicksPath)) {
        console.log('Cron job already exists. Updating...');
        // Remove existing job
        currentCrontab = currentCrontab
          .split('\n')
          .filter(line => !line.includes(dailyPicksPath))
          .join('\n');
      }
      
      // Add new job
      const newCrontab = currentCrontab + (currentCrontab.endsWith('\n') ? '' : '\n') + cronLine + '\n';
      
      // Write to temp file and install
      const tempFile = path.join(projectDir, 'temp_crontab');
      fs.writeFileSync(tempFile, newCrontab);
      execSync(`crontab ${tempFile}`);
      fs.unlinkSync(tempFile);
      
      console.log(`Cron job installed to run daily at ${time}.`);
      if (email && email.trim() !== '') {
        console.log(`Daily picks will be sent to ${email}`);
      }
    } catch (error) {
      console.error('Error installing cron job:', error.message);
    }
    
    rl.close();
  });
});