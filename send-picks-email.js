#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { format } = require('date-fns');

// Configuration
const EMAIL_RECIPIENTS = process.env.EMAIL_RECIPIENTS || '';
const EMAIL_SUBJECT = `AI-BET Predictions for ${format(new Date(), 'MMM d, yyyy')}`;
const PICKS_FILE = path.join(__dirname, 'todays-picks.txt');

// Function to send email using mailx (Unix/macOS) or mail (Linux)
function sendEmail(to, subject, body) {
  if (!to || to.trim() === '') {
    console.error('Error: No recipient email address provided');
    console.error('Please provide an email address as a command line argument:');
    console.error('node send-picks-email.js your-email@example.com');
    process.exit(1);
  }
  
  // Escape the body for terminal
  const escapedBody = body.replace(/"/g, '\\"').replace(/`/g, '\\`');
  
  // Log that we're sending an email
  console.log(`Sending email to ${to} with subject "${subject}"`);
  console.log(`Email body length: ${body.length} characters`);
  
  // Create the email command
  const command = `echo "${escapedBody}" | mail -s "${subject}" ${to}`;
  
  // Execute the command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error sending email: ${error.message}`);
      console.error(`You might need to install mailx or configure your mail system.`);
      console.error(`On macOS, try: brew install mailutils`);
      console.error(`On Ubuntu/Debian, try: sudo apt-get install mailutils`);
      return;
    }
    
    if (stderr) {
      console.error(`Email command stderr: ${stderr}`);
      return;
    }
    
    console.log(`Email sent successfully to ${to}`);
  });
}

// Alternative function to send email using smtp.js if available
// You would need to install smtp.js with: npm install smtp-client
function sendEmailSmtp(to, subject, body) {
  try {
    const { SMTPClient } = require('smtp-client');
    
    const smtp = new SMTPClient({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    smtp.connect()
      .then(() => smtp.greet({ hostname: process.env.SMTP_HOSTNAME || 'localhost' }))
      .then(() => smtp.auth())
      .then(() => smtp.mail({ from: process.env.SMTP_FROM || process.env.SMTP_USER }))
      .then(() => smtp.rcpt({ to: to.split(',') }))
      .then(() => smtp.data(
        `From: AI-BET <${process.env.SMTP_FROM || process.env.SMTP_USER}>\r\n` +
        `To: ${to}\r\n` +
        `Subject: ${subject}\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n` +
        `\r\n` +
        `${body}`
      ))
      .then(() => smtp.quit())
      .then(() => console.log(`Email sent successfully to ${to}`))
      .catch(err => console.error(`SMTP Error: ${err.message}`));
  } catch (error) {
    console.error(`SMTP module error: ${error.message}`);
    console.error(`Falling back to mailx...`);
    sendEmail(to, subject, body);
  }
}

// Main function
async function main() {
  try {
    console.log('Reading predictions file...');
    
    // Check if the file exists
    if (!fs.existsSync(PICKS_FILE)) {
      console.error(`File not found: ${PICKS_FILE}`);
      console.error('Please run daily-picks.js first to generate the predictions.');
      process.exit(1);
    }
    
    // Read the file
    const emailBody = fs.readFileSync(PICKS_FILE, 'utf8');
    
    // Get email recipient from command line or environment
    const emailRecipient = process.argv[2] || EMAIL_RECIPIENTS;
    
    console.log('Sending email...');
    
    // Send the email
    sendEmail(emailRecipient, EMAIL_SUBJECT, emailBody);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Print setup instructions
function printSetupInstructions() {
  console.log('\nUsage: node send-picks-email.js [recipient-email]');
  console.log('\nYou can also set the EMAIL_RECIPIENTS environment variable:');
  console.log('  export EMAIL_RECIPIENTS=your-email@example.com');
}

// Run the main function
if (require.main === module) {
  if (process.argv.includes('--help')) {
    printSetupInstructions();
  } else {
    main();
  }
} 