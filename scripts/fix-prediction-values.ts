import { PrismaClient, PredictionType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPredictionValues() {
  try {
    // Get all predictions
    const predictions = await prisma.prediction.findMany({
      include: {
        game: true
      }
    });

    console.log(`Found ${predictions.length} predictions to check`);
    let updatedCount = 0;

    for (const pred of predictions) {
      let shouldUpdate = false;
      let newValue = pred.predictionValue;

      if (pred.predictionType === PredictionType.TOTAL) {
        // Fix total values that are missing 'o' or 'u' prefix
        if (pred.predictionValue === '0' || pred.predictionValue === '-1') {
          newValue = 'o8.5';
          shouldUpdate = true;
        } else if (!pred.predictionValue.startsWith('o') && !pred.predictionValue.startsWith('u')) {
          newValue = 'o' + pred.predictionValue;
          shouldUpdate = true;
        }
      } else if (pred.predictionType === PredictionType.SPREAD) {
        // Fix invalid spread values
        if (pred.predictionValue === '0') {
          newValue = '-1.5';
          shouldUpdate = true;
        }
      } else if (pred.predictionType === PredictionType.MONEYLINE) {
        // Fix invalid moneyline values
        if (['0', '1', '-1'].includes(pred.predictionValue)) {
          newValue = '-110';
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        await prisma.prediction.update({
          where: { id: pred.id },
          data: { predictionValue: newValue }
        });
        console.log(`Updated prediction ${pred.id}:`);
        console.log(`  Type: ${pred.predictionType}`);
        console.log(`  Old value: ${pred.predictionValue}`);
        console.log(`  New value: ${newValue}`);
        console.log('----------------------------------------');
        updatedCount++;
      }
    }

    console.log(`\nUpdated ${updatedCount} predictions`);

  } catch (error) {
    console.error('Error fixing prediction values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPredictionValues().catch(console.error); 