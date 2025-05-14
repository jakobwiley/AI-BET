import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  console.log('Starting confidence value fix script...');
  
  // 1. Get all predictions
  const predictions = await prisma.prediction.findMany();
  console.log(`Found ${predictions.length} predictions to process`);
  
  let fixedCount = 0;
  
  // 2. Process each prediction
  for (const prediction of predictions) {
    let shouldUpdate = false;
    let newConfidence = prediction.confidence;
    
    // Check for invalid values
    if (newConfidence === null || isNaN(newConfidence)) {
      console.log(`Fixing null/NaN confidence for prediction ${prediction.id}`);
      // Set default confidence of 70% for invalid values
      newConfidence = 0.7;
      shouldUpdate = true;
    }
    // Check if confidence is >1 (percentage format instead of decimal)
    else if (newConfidence > 1) {
      console.log(`Converting percentage confidence (${newConfidence}) to decimal for prediction ${prediction.id}`);
      newConfidence = newConfidence / 100;
      shouldUpdate = true;
    }
    
    // Update prediction if needed
    if (shouldUpdate) {
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { confidence: newConfidence }
      });
      fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} predictions with invalid confidence values`);
  console.log('Script completed successfully');
}

main()
  .catch((e) => {
    console.error('Error running confidence fix script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 