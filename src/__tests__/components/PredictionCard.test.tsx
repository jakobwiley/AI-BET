import { render, screen } from '@testing-library/react';
import PredictionCard from '@/components/PredictionCard';
import { Prediction } from '@/models/types';

describe('PredictionCard Component', () => {
  const mockPrediction: Prediction = {
    id: '1',
    gameId: 'game-1',
    predictionType: 'SPREAD',
    predictionValue: 'HOME -5.5',
    confidence: 0.75,
    reasoning: 'Test reasoning',
    createdAt: new Date(),
    game: {
      id: 'game-1',
      sport: 'NBA' as const,
      gameDate: new Date(),
      homeTeamId: '1',
      awayTeamId: '2',
      homeTeamName: 'Lakers',
      awayTeamName: 'Warriors',
      status: 'SCHEDULED' as const,
      predictions: [],
      playerProps: []
    }
  };

  it('should render prediction details correctly', () => {
    render(<PredictionCard prediction={mockPrediction} />);

    // Check prediction type and value
    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByText('HOME -5.5')).toBeInTheDocument();

    // Check confidence level
    expect(screen.getByText('75%')).toBeInTheDocument();

    // Check reasoning
    expect(screen.getByText('Test reasoning')).toBeInTheDocument();

    // Check game details
    expect(screen.getByText('Reasoning')).toBeInTheDocument();
  });

  it('should render different prediction types correctly', () => {
    const moneylinePrediction: Prediction = {
      ...mockPrediction,
      predictionType: 'MONEYLINE',
      predictionValue: 'HOME +150'
    };

    render(<PredictionCard prediction={moneylinePrediction} />);

    expect(screen.getByText('Moneyline')).toBeInTheDocument();
    expect(screen.getByText('HOME +150')).toBeInTheDocument();
  });

  it('should render confidence level with correct indicator', () => {
    const highConfidencePrediction: Prediction = {
      ...mockPrediction,
      confidence: 0.85
    };

    render(<PredictionCard prediction={highConfidencePrediction} />);

    const confidenceElement = screen.getByText('85%');
    expect(confidenceElement).toBeInTheDocument();
    // Check that the indicator dot has the right color class
    const indicatorDot = document.querySelector('.w-2.h-2.rounded-full.mr-1.bg-green-500');
    expect(indicatorDot).toBeInTheDocument();
  });

  it('should render low confidence level with correct indicator', () => {
    const lowConfidencePrediction: Prediction = {
      ...mockPrediction,
      confidence: 0.55
    };

    render(<PredictionCard prediction={lowConfidencePrediction} />);

    const confidenceElement = screen.getByText('55%');
    expect(confidenceElement).toBeInTheDocument();
    // Check that the indicator dot has the right color class
    const indicatorDot = document.querySelector('.w-2.h-2.rounded-full.mr-1.bg-yellow-500');
    expect(indicatorDot).toBeInTheDocument();
  });

  it('should render very low confidence level with correct indicator', () => {
    const veryLowConfidencePrediction: Prediction = {
      ...mockPrediction,
      confidence: 0.45
    };

    render(<PredictionCard prediction={veryLowConfidencePrediction} />);

    const confidenceElement = screen.getByText('45%');
    expect(confidenceElement).toBeInTheDocument();
    // Check that the indicator dot has the right color class
    const indicatorDot = document.querySelector('.w-2.h-2.rounded-full.mr-1.bg-red-500');
    expect(indicatorDot).toBeInTheDocument();
  });
}); 