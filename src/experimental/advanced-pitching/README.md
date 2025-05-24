# Advanced Pitching Module

This module contains robust, modern, and self-contained logic for calculating advanced pitcher factors for MLB prediction models.

## Structure
- `factorCalculator.ts` — Core calculation logic for pitcher/team factors
- `testFactorCalculator.ts` — Self-contained test harness (mock and real data)
- `loader.ts` — Utility for loading pitcher stats from JSON
- `data/samplePitcherStats.json` — Example pitcher stats file

## Usage

### Run the test harness:
```sh
npx ts-node src/experimental/advanced-pitching/testFactorCalculator.ts
```

### Add new factors
- Extend `PitcherStats` and add new calculation functions in `factorCalculator.ts`.

### Data
- Place JSON or CSV pitcher/team stats in the `data/` folder and load them via `loader.ts`.

## Legacy Scripts
- Legacy scripts in other directories are deprecated and will be removed as this module is expanded.
