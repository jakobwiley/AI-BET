# BetAI - Sports Betting Predictions App

BetAI is a Next.js application that provides AI-powered sports betting predictions for NBA and MLB games.

## Features

- View upcoming NBA and MLB games
- Get AI-generated predictions for game outcomes
- See player prop predictions with confidence ratings
- Mobile-friendly responsive design
- Dark mode UI

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **State Management**: React Context API & Hooks
- **Styling**: Tailwind CSS, Framer Motion for animations
- **Authentication**: NextAuth.js (planned)
- **Database**: Prisma ORM with PostgreSQL (planned)

## API Integration

BetAI uses multiple APIs to provide sports data and predictions:

1. **SportsData.io API** - For real-time sports data, including games, teams, and scores
2. **The Odds API** - For current betting odds and lines
3. **OpenAI API** - For generating AI-powered predictions based on historical data

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- API keys for the services mentioned above

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/betai.git
cd betai
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local` and fill in your API keys:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## API Keys Setup

To use the full functionality of BetAI, you'll need to obtain API keys for the following services:

### SportsData.io
1. Sign up at [SportsData.io](https://sportsdata.io/)
2. Subscribe to the NBA API and/or MLB API
3. Add your API key to the `.env.local` file:
```
NEXT_PUBLIC_SPORTS_DATA_API_KEY=your_api_key_here
```

### The Odds API
1. Sign up at [The Odds API](https://the-odds-api.com/)
2. Get your API key
3. Add your API key to the `.env.local` file:
```
NEXT_PUBLIC_THE_ODDS_API_KEY=your_api_key_here
```

### OpenAI API
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Generate an API key
3. Add your API key to the `.env.local` file:
```
OPENAI_API_KEY=your_api_key_here
```

## Using the API Integration

The API integration is implemented in the following files:

- `src/lib/sportsApi.ts` - Main API service for fetching sports data and predictions
- `src/hooks/useSportsData.ts` - React hooks for using the API in components

To use the hooks in your components:

```tsx
import { useUpcomingGames, useGamePredictions, usePlayerProps } from '@/hooks/useSportsData';

// In your component:
const { games, loading, error } = useUpcomingGames('NBA');
const { predictions } = useGamePredictions(gameId);
const { playerProps } = usePlayerProps(gameId, 'NBA');
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Sports data provided by SportsData.io and The Odds API
- Icons by FontAwesome via react-icons 