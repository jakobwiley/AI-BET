import Link from "next/link";
import { FaBasketballBall, FaBaseballBall, FaChartLine, FaLightbulb } from "react-icons/fa";

export default function Home() {
  return (
    <main className="flex flex-col items-center">
      <div className="text-center py-12 md:py-24">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          BetAI
        </h1>
        <p className="text-xl md:text-2xl max-w-2xl mx-auto text-gray-300 mb-8">
          AI-powered sports betting predictions with confidence ratings you can trust
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Link 
            href="/nba" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center"
          >
            <FaBasketballBall className="mr-2" />
            NBA Predictions
          </Link>
          <Link 
            href="/mlb" 
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center"
          >
            <FaBaseballBall className="mr-2" />
            MLB Predictions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mb-16">
        <div className="bg-gray-800 rounded-xl p-6 hover:shadow-xl transition-all">
          <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <FaLightbulb size={24} />
          </div>
          <h2 className="text-xl font-bold mb-2">Smart Predictions</h2>
          <p className="text-gray-300">
            Our AI analyzes thousands of data points to provide accurate predictions with detailed reasoning.
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 hover:shadow-xl transition-all">
          <div className="bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <FaChartLine size={24} />
          </div>
          <h2 className="text-xl font-bold mb-2">Confidence Ratings</h2>
          <p className="text-gray-300">
            Each prediction comes with a confidence rating, so you know which bets have the highest probability.
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 hover:shadow-xl transition-all">
          <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <FaBaseballBall size={24} className="mr-1" />
            <FaBasketballBall size={20} />
          </div>
          <h2 className="text-xl font-bold mb-2">MLB & NBA Coverage</h2>
          <p className="text-gray-300">
            Comprehensive coverage of all MLB and NBA games, including game outcomes and player props.
          </p>
        </div>
      </div>
      
      <div className="w-full max-w-4xl bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 mb-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to make smarter bets?</h2>
        <p className="text-lg mb-6">
          Sign up now to get access to all our predictions and start winning!
        </p>
        <Link 
          href="/auth/signin" 
          className="bg-white text-purple-700 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg shadow-lg transition-all inline-block"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
} 