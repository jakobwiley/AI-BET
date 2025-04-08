import { render, screen } from '@testing-library/react';
import PredictionCard from '@/components/PredictionCard';
import { Prediction } from '@/models/types';

describe('PredictionCard Component', () => {
  const mockPrediction: Prediction = {
    id: '1',
    gameId: 'game-1',
    predictionType: 'SPREAD',
    predictionValue: 'HOME -5.5',
    confidence: 75,
    reasoning: 'Test reasoning',
    createdAt: '2024-03-20T00:00:00Z'
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

    // Check reasoning label
    expect(screen.getByText('Reasoning:')).toBeInTheDocument();
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
      confidence: 85
    };

    render(<PredictionCard prediction={highConfidencePrediction} />);

    const confidenceElement = screen.getByText('85%');
    expect(confidenceElement).toBeInTheDocument();
    // Check that the indicator dot has the right color class
    expect(screen.getByTestId('confidence-indicator')).toHaveClass('bg-green-500');
  });

  it('should render low confidence level with correct indicator', () => {
    const lowConfidencePrediction: Prediction = {
      ...mockPrediction,
      confidence: 55
    };

    render(<PredictionCard prediction={lowConfidencePrediction} />);

    const confidenceElement = screen.getByText('55%');
    expect(confidenceElement).toBeInTheDocument();
    // Check that the indicator dot has the right color class
    expect(screen.getByTestId('confidence-indicator')).toHaveClass('bg-yellow-500');
  });

  it('should render very low confidence level with correct indicator', () => {
    const veryLowConfidencePrediction: Prediction = {
      ...mockPrediction,
      confidence: 45
    };

    render(<PredictionCard prediction={veryLowConfidencePrediction} />);

    const confidenceElement = screen.getByText('45%');
    expect(confidenceElement).toBeInTheDocument();
    // Check that the indicator dot has the right color class
    expect(screen.getByTestId('confidence-indicator')).toHaveClass('bg-red-500');
  });
}); 