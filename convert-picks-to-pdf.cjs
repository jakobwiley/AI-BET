#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get project directory and files
const projectDir = path.resolve(__dirname);
const inputFile = path.join(projectDir, 'todays-picks.txt');
const outputFile = path.join(projectDir, 'todays-picks.pdf');

// Generate PDF function
function convertTextToPdf() {
  try {
    // Check if the input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: ${inputFile} does not exist. Run daily-picks.js first.`);
      process.exit(1);
    }

    console.log(`Converting ${inputFile} to PDF...`);
    
    // Option 1: Using textutil (MacOS)
    if (process.platform === 'darwin') {
      try {
        execSync(`textutil -convert rtf ${inputFile} -output ${inputFile}.rtf`);
        execSync(`textutil -convert pdf ${inputFile}.rtf -output ${outputFile}`);
        fs.unlinkSync(`${inputFile}.rtf`); // Clean up the intermediate file
        console.log(`✅ PDF created: ${outputFile}`);
        return;
      } catch (error) {
        console.log('MacOS textutil method failed, trying alternative method...');
      }
    }
    
    // Option 2: Using pandoc if available
    try {
      execSync('which pandoc', { stdio: 'ignore' });
      execSync(`pandoc ${inputFile} -o ${outputFile}`);
      console.log(`✅ PDF created: ${outputFile}`);
      return;
    } catch (error) {
      console.log('Pandoc method failed, trying alternative method...');
    }
    
    // Option 3: Using enscript and ps2pdf if available (Linux/Unix)
    try {
      execSync('which enscript ps2pdf', { stdio: 'ignore' });
      execSync(`enscript -p ${inputFile}.ps ${inputFile}`);
      execSync(`ps2pdf ${inputFile}.ps ${outputFile}`);
      fs.unlinkSync(`${inputFile}.ps`); // Clean up the intermediate file
      console.log(`✅ PDF created: ${outputFile}`);
      return;
    } catch (error) {
      console.error('All PDF conversion methods failed.');
      console.error('Please install one of these tools:');
      console.error('- MacOS: textutil (should be pre-installed)');
      console.error('- Any OS: pandoc (brew install pandoc or apt-get install pandoc)');
      console.error('- Linux: enscript and ghostscript (apt-get install enscript ghostscript)');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error converting to PDF:', error.message);
    process.exit(1);
  }
}

// Run the conversion
convertTextToPdf(); 