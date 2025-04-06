# AI-BET

A Next.js application for sports betting analysis, predictions, and odds tracking for NBA and MLB games.

## Features

- Real-time game data from The Odds API
- Game predictions and analysis
- Player props and statistics
- Team information and logos
- Game details with odds and spread information
- Beautiful, responsive UI built with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - The Odds API (https://the-odds-api.com/)
  - OpenAI API (optional, for AI-based predictions)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/AI-BET.git
   cd AI-BET
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   NEXT_PUBLIC_THE_ODDS_API_KEY=your_odds_api_key
   NEXT_PUBLIC_SPORTS_DATA_API_KEY=your_sports_data_api_key
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   LOG_LEVEL=INFO
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/components` - React components
- `/hooks` - Custom React hooks
- `/lib` - API services and utilities
- `/models` - TypeScript interfaces and types
- `/pages` - Next.js pages
- `/public` - Static assets
- `/styles` - Global CSS styles
- `/utils` - Helper functions

## Current Development Phase

Phase 3: Real Game Data Integration

- Fetching real NBA and MLB games from The Odds API
- Displaying actual odds and spreads
- Integrating player and team information
- Building analytics and prediction models

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [The Odds API](https://the-odds-api.com/) - Sports data
- [OpenAI API](https://openai.com/) - AI predictions (optional)
- [Jest](https://jestjs.io/) - Testing

## License

This project is for personal use only.

## Acknowledgments

- The Odds API for providing sports data
- OpenAI for prediction capabilities
