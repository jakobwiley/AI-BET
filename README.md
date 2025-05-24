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

### MLB Data Pipeline

#### Advanced Hitter Stats Integration

- The prediction pipeline now loads and injects advanced hitter stats (wOBA, wRC+, OBP, SLG, etc.) for every probable starting lineup in MLB games.
- These stats are used as core features for totals and other bet types, with lineup-level metrics (average wOBA, wRC+, etc.) directly influencing prediction factors.
- This enables the model to account for both pitcher and hitter quality, providing a much more accurate and nuanced prediction for each game.
- The integration is modular and extensible, allowing for future addition of splits, trends, and more advanced insights.

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