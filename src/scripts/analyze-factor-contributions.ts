import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';

interface FactorAnalysis {
  factor: string;
  winRate: number;
  avgConfidence: number;
  contribution: number;
  sampleSize: number;
}

async function analyzeFactorContributions() {
  try {
    // Get all factor contribution logs from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.prediction.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        },
        predictionType: 'SPREAD',
        outcome: { in: ['WIN', 'LOSS', 'PUSH'] }
      },
      include: {
        game: true
      }
    });

    // Initialize factor analysis
    const factorAnalysis: Record<string, FactorAnalysis> = {
      teamStrength: { factor: 'Team Strength', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      homeAdvantage: { factor: 'Home Advantage', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      recentForm: { factor: 'Recent Form', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      headToHead: { factor: 'Head-to-Head History', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      scoringDifferential: { factor: 'Scoring Differential', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      pitcherMatchup: { factor: 'Starting Pitcher Matchup', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      teamPitching: { factor: 'Team Pitching', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      batterHandedness: { factor: 'Batter Handedness', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      ballpark: { factor: 'Ballpark Factor', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      battingStrength: { factor: 'Batting Strength', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      pitchingStrength: { factor: 'Pitching Strength', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      keyPlayerImpact: { factor: 'Key Player Impact', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 },
      rest: { factor: 'Rest Days', winRate: 0, avgConfidence: 0, contribution: 0, sampleSize: 0 }
    };

    // Analyze each prediction
    for (const prediction of logs) {
      if (!prediction.reasoning) continue;

      let factors;
      try {
        factors = JSON.parse(prediction.reasoning);
      } catch (e) {
        console.warn('Skipping invalid reasoning JSON:', prediction.reasoning);
        continue;
      }
      const isWin = prediction.outcome === 'WIN';

      // Update factor analysis
      for (const [factor, value] of Object.entries(factors)) {
        if (factorAnalysis[factor]) {
          const analysis = factorAnalysis[factor];
          analysis.winRate = (analysis.winRate * analysis.sampleSize + (isWin ? 1 : 0)) / (analysis.sampleSize + 1);
          analysis.avgConfidence = (analysis.avgConfidence * analysis.sampleSize + prediction.confidence) / (analysis.sampleSize + 1);
          analysis.contribution += Number(value);
          analysis.sampleSize++;
        }
      }
    }

    // Calculate final metrics and sort by contribution
    const sortedFactors = Object.values(factorAnalysis)
      .map(analysis => ({
        ...analysis,
        contribution: analysis.contribution / analysis.sampleSize
      }))
      .sort((a, b) => b.contribution - a.contribution);

    // Print analysis results
    console.log('\nFactor Contribution Analysis (Last 30 Days):');
    console.log('===========================================');
    console.log(`Total Predictions Analyzed: ${logs.length}\n`);

    console.log('Factor Performance:');
    console.log('------------------');
    for (const factor of sortedFactors) {
      console.log(`\n${factor.factor}:`);
      console.log(`  Win Rate: ${(factor.winRate * 100).toFixed(1)}%`);
      console.log(`  Average Confidence: ${factor.avgConfidence.toFixed(2)}`);
      console.log(`  Contribution Score: ${factor.contribution.toFixed(2)}`);
      console.log(`  Sample Size: ${factor.sampleSize}`);
    }

  } catch (error) {
    console.error('Error analyzing factor contributions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeFactorContributions(); 