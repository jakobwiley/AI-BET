# BetAI - Sports Betting Prediction App

BetAI is a modern, AI-powered sports betting prediction platform that provides high-confidence predictions for MLB games, including both game outcomes and player props.

![BetAI Screenshot](https://via.placeholder.com/800x400?text=BetAI+Screenshot)

## Features

- **MLB Predictions**: Get AI-powered predictions for all MLB games
- **Player Props**: Detailed player prop predictions with confidence ratings
- **Confidence Ratings**: Each prediction includes a confidence percentage to help you make smarter bets
- **Detailed Insights**: Reasoning behind each prediction to understand the AI's decision-making
- **Mobile & Desktop Friendly**: Responsive design for all devices
- **User Authentication**: Save your favorite teams and players

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/betai.git
   cd betai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Update the values with your database connection string and API keys

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Keys & External Services

BetAI uses the following APIs for sports data:

- [SportsData.io](https://sportsdata.io/) - For MLB game data
- [The Odds API](https://the-odds-api.com/) - For betting odds

You'll need to sign up for these services and add your API keys to the `.env.local` file.

## Project Structure

```
betai/
├── prisma/           # Database schema and migrations
├── public/           # Static assets
├── src/
│   ├── app/          # Next.js app router and pages
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility functions and API clients
│   ├── models/       # TypeScript types and interfaces
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Testing Policy (Mandatory)

All new data pipelines, scripts, and integrations—including advanced stats for pitchers and hitters, splits, streaks, and future enhancements—**must be tested and validated before integration**. This applies to both Python and TypeScript workflows. Always run and validate scripts before proceeding to integration or further development. This is a core project best practice and must be reflected in all documentation.

### Testing & Validation Instructions

- **Python Scripts:**
  - Run `scripts/fetch-hitter-splits-and-streaks.py` and ensure it produces a valid JSON file in `data/hitter_splits_streaks_<DATE>.json`.
  - Validate the file structure and check for missing/null values.
- **TypeScript Loaders:**
  - Use `src/mlb-data/hitterSplitsLoader.ts` to load and inspect splits/streaks for a given date.
  - Ensure the loader throws clear errors for missing or malformed files.
- **Prediction Pipeline:**
  - Run `src/scripts/generate-mlb-predictions.ts` and verify that predictions include lineup splits and streaks.
  - Validate output for edge cases (missing data, partial lineups, etc.).

All test runs and validations should be logged or noted for future reference. If issues are found, resolve them before proceeding.

---

### Script Usage

#### Fetch Hitter Splits & Streaks
```bash
python scripts/fetch-hitter-splits-and-streaks.py --date YYYY-MM-DD
```
- Generates `data/hitter_splits_streaks_<DATE>.json` for use in predictions.

#### Load Hitter Splits/Streaks in TypeScript
```typescript
import { loadHitterSplitsStreaks } from '../mlb-data/hitterSplitsLoader';
const splits = loadHitterSplitsStreaks('2025-05-23');
```

#### Generate MLB Predictions
```bash
npx tsx src/scripts/generate-mlb-predictions.ts
```
- Ensures advanced stats, splits, and streaks are included in model calculations.

---

## Advanced Pitcher Stats Workflow

- Advanced pitcher analytics integrated into prediction model (ERA, FIP, xFIP, SIERA, K/BB, WAR)
- Advanced hitter analytics (wOBA, wRC+, OBP, SLG, BB%, K%, WAR, etc.) integrated into prediction model for all MLB games
- Modular pipeline for fetching, validating, and loading both pitcher and hitter stats.py`, which uses the `pybaseball` library to pull real, up-to-date MLB data.
- Output is saved as `data/pitcher_advanced_stats_<YEAR>.json`.
- The TypeScript pipeline loads this canonical JSON file in `src/mlb-data/fetch-pitcher-advanced-stats.ts` and filters for today's probable pitchers.
- All legacy FanGraphs scraping logic has been removed for reliability and maintainability.

**Process:**
- Always use real, tested data sources.
- Validate and test all data before marking a pipeline as complete.
- Document all changes and update this README and the PRD as the source of truth.

### Advanced Pitcher & Hitter Stats Workflow

- Advanced pitcher analytics integrated into prediction model (ERA, FIP, xFIP, SIERA, K/BB, WAR)
- Advanced hitter analytics (wOBA, wRC+, OBP, SLG, BB%, K%, WAR, etc.) integrated into prediction model for all MLB games
- Modular pipeline for fetching, validating, and loading both pitcher and hitter stats.
- **NEW:** Hitter splits and streaks (vs. LHP/RHP, home/away, last 7/14/30 days) are now integrated via `scripts/fetch-hitter-splits-and-streaks.py` and loaded with `src/mlb-data/hitter-stats-loader.ts`.
- These insights are attached to each lineup in the prediction pipeline and used in the model for improved prediction accuracy.
- All data scripts and loaders are designed for automation and easy extension by future agents or contributors.

**Process:**
- Always use real, tested data sources.
- Validate and test all data before marking a pipeline as complete.
- Document all changes and update this README and the PRD as the source of truth.

---

## Hitter Stats Loader (Automated MLB API Integration)

The system now automatically fetches and aggregates MLB hitter stats—including recent form, home/away splits, and current streaks—using only the public MLB API.

### Features
- **Up-to-date stats for all active hitters**
- **Recent form**: AVG, OBP, SLG, OPS, HR, RBI, etc. for last 7, 14, 30 days
- **Splits**: Home vs. Away (same metrics)
- **Streaks**:
  - `hit`: Consecutive games with at least one hit
  - `on_base`: Consecutive games reaching base (hit, walk, or HBP)
  - `multi_hit`: Consecutive games with 2+ hits
  - `hr`: Consecutive games with a home run

### Usage

Import and use the loader in your pipeline:

```typescript
import { HitterStatsLoader } from './src/mlb-data/hitter-stats-loader';

const loader = new HitterStatsLoader();
const judge = loader.getByName('Aaron Judge');
if (judge) {
  // Use judge.recent, judge.splits, judge.streaks
  console.log(judge.streaks.hit); // e.g., current hitting streak
}
```

### Data Location
- JSON file: `data/hitter_splits_streaks_{YYYY-MM-DD}.json`
- Loader will default to today's file, or you can specify a path.

### Testing
Run the loader directly with ts-node to see a sample:
```sh
ts-node src/mlb-data/hitter-stats-loader.ts
```

### Integration
- Use these stats and streaks directly as features in your prediction models.
- Boost probabilities for hitters on long streaks, or use splits/recent form as model inputs.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Sports data provided by SportsData.io and The Odds API
- Icons by FontAwesome via react-icons 

# AI-BET: MLB Game Predictions

## Quick Start

To fetch today's MLB games and odds, and generate predictions:

1. **Fetch Today's Games**
```bash
npx tsx src/scripts/fetch-todays-games.ts
```
This will fetch today's MLB games from the Odds API and store them in the database.

2. **Show Today's Odds**
```bash
npx tsx src/scripts/show-odds.ts
```
This will display the odds for today's games.

3. **Generate Predictions**
```bash
npx tsx scripts/test-ml-model.ts
```
This will use the enhanced prediction model to generate predictions for today's games.

## Script Details

### `fetch-todays-games.ts`
- Fetches MLB games scheduled for today
- Stores games in the database with basic info (teams, date, time)
- Uses OddsApiService to get fresh data
- Includes retry logic for reliability

### `show-odds.ts`
- Retrieves today's games from the database
- Displays odds in a readable format
- Shows moneyline, spread, and total for each game

### `test-ml-model.ts`
- Uses the EnhancedPredictionModel to generate predictions
- Takes into account:
  - Team win rates
  - Recent scores
  - Historical accuracy
  - Current odds
- Outputs predictions with confidence levels and reasoning

## Data Flow
1. Games are fetched and stored in the database
2. Odds are fetched and attached to games
3. Prediction model analyzes the data and generates picks
4. Results are displayed with confidence levels and reasoning

## Troubleshooting
If you encounter issues:
1. Check that the Odds API key is set in your .env file
2. Verify the database connection
3. Check the logs for any error messages
4. Ensure you're running the scripts in the correct order 