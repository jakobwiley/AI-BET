# BetAI - Sports Betting Prediction App

BetAI is a modern, AI-powered sports betting prediction platform that provides high-confidence predictions for NBA and MLB games, including both game outcomes and player props.

![BetAI Screenshot](https://via.placeholder.com/800x400?text=BetAI+Screenshot)

## Features

- **NBA & MLB Predictions**: Get AI-powered predictions for all NBA and MLB games
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

- [SportsData.io](https://sportsdata.io/) - For NBA and MLB game data
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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Sports data provided by SportsData.io and The Odds API
- Icons by FontAwesome via react-icons 