#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { format } from 'date-fns';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EMAIL_RECIPIENTS = process.env.EMAIL_RECIPIENTS || '';
const EMAIL_SUBJECT = `AI-BET Predictions for ${format(new Date(), 'MMM d, yyyy')}`;
const PICKS_FILE = path.join(__dirname, 'todays-picks.txt');

// Function to send email using mailx (Unix/macOS) or mail (Linux)
async function sendEmail(to, subject, body) {
  if (!to || to.trim() === '') {
    throw new Error(
      'No recipient email address provided. Please provide an email address as a command line argument:\n' +
      'node send-picks-email.js your-email@example.com'
    );
  }
  
  // Escape the body for terminal
  const escapedBody = body.replace(/"/g, '\\"').replace(/`/g, '\\`');
  
  // Log that we're sending an email
  console.log(`Sending email to ${to} with subject "${subject}"`);
  console.log(`Email body length: ${body.length} characters`);
  
  // Create the email command
  const command = `echo "${escapedBody}" | mail -s "${subject}" ${to}`;
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.warn(`Warning: ${stderr}`);
    }
    
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:');
    console.error(`Error: ${error.message}`);
    console.error('\nYou might need to install mailx or configure your mail system:');
    console.error('- On macOS: brew install mailutils');
    console.error('- On Ubuntu/Debian: sudo apt-get install mailutils');
    throw error;
  }
}

// Alternative function to send email using smtp.js if available
async function sendEmailSmtp(to, subject, body) {
  try {
    const { SMTPClient } = await import('smtp-client');
    
    const smtp = new SMTPClient({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    await smtp.connect();
    await smtp.greet({ hostname: process.env.SMTP_HOSTNAME || 'localhost' });
    await smtp.auth();
    await smtp.mail({ from: process.env.SMTP_FROM || process.env.SMTP_USER });
    await smtp.rcpt({ to: to.split(',') });
    await smtp.data(
      `From: AI-BET <${process.env.SMTP_FROM || process.env.SMTP_USER}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `\r\n` +
      `${body}`
    );
    await smtp.quit();
    
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`SMTP Error: ${error.message}`);
    console.error('Falling back to mailx...');
    return sendEmail(to, subject, body);
  }
}

// Main function
async function main() {
  try {
    console.log('Reading predictions file...');
    
    // Check if the file exists
    try {
      await fs.access(PICKS_FILE);
    } catch (error) {
      throw new Error(
        `File not found: ${PICKS_FILE}\n` +
        'Please run daily-picks.js first to generate the predictions.'
      );
    }
    
    // Read the file
    const emailBody = await fs.readFile(PICKS_FILE, 'utf8');
    
    // Get email recipient from command line or environment
    const emailRecipient = process.argv[2] || EMAIL_RECIPIENTS;
    
    console.log('Sending email...');
    
    // Try SMTP first, fall back to mailx
    try {
      await sendEmailSmtp(emailRecipient, EMAIL_SUBJECT, emailBody);
    } catch (error) {
      console.error('SMTP failed, trying mailx...');
      await sendEmail(emailRecipient, EMAIL_SUBJECT, emailBody);
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Print setup instructions
function printSetupInstructions() {
  console.log('\nUsage: node send-picks-email.js [recipient-email]');
  console.log('\nYou can also set the EMAIL_RECIPIENTS environment variable:');
  console.log('  export EMAIL_RECIPIENTS=your-email@example.com');
  console.log('\nFor SMTP support, set these environment variables:');
  console.log('  SMTP_HOST - SMTP server hostname');
  console.log('  SMTP_PORT - SMTP server port');
  console.log('  SMTP_USER - SMTP username');
  console.log('  SMTP_PASSWORD - SMTP password');
  console.log('  SMTP_FROM - From email address');
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    printSetupInstructions();
  } else {
    main().catch(() => process.exit(1));
  }
} 