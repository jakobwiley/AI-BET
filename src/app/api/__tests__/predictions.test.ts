/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'; // Correct type
import { GET } from '../games/[id]/route'; // Correct route
import { PredictionService } from '@/lib/predictionService';
import { OddsApiService } from '@/lib/oddsApi'; // Import OddsApiService
import { Game, Prediction, PredictionType, SportType } from '@/models/types';

// Mock the services
jest.mock('@/lib/predictionService');
jest.mock('@/lib/oddsApi'); // Mock OddsApiService

// Mock Game Data (simplified)
const mockGame: Game = {
  id: 'test-game-1',
  sport: 'NBA',
  homeTeamId: 'miami-heat',
  awayTeamId: 'boston-celtics',
  homeTeamName: 'Miami Heat',
  awayTeamName: 'Boston Celtics',
  gameDate: '2025-04-07T23:00:00Z',
  startTime: '7:00 PM',
  status: 'scheduled',
  odds: { /* simplified odds */ }, 
  predictions: [] // Initialize predictions array
};

const mockPrediction: Prediction = {
    id: 'pred-1',
    gameId: mockGame.id,
    predictionType: 'SPREAD',
    predictionValue: -3.5, // Use number
    confidence: 75.5,
    grade: 'B',
    reasoning: 'Based on recent performance...',
    createdAt: new Date().toISOString()
};

const mockSpreadPredictionArray: Prediction[] = [mockPrediction]; // Use a specific prediction type for clarity

describe('Predictions API Route', () => {

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    (OddsApiService.prototype.getExternalGameById as jest.Mock).mockResolvedValue(mockGame); 
    (PredictionService.getPredictionsForGame as jest.Mock).mockResolvedValue(mockSpreadPredictionArray);
  });

  it('should return 400 for missing sport query parameter', async () => {
    const request = new Request('http://localhost:3000/api/games/test-game-1') as NextRequest; // Use NextRequest
    const response = await GET(request, { params: { id: 'test-game-1' } }); // Use id param
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing or invalid sport query parameter (NBA or MLB required)');
  });
  
  it('should return 400 for invalid sport query parameter', async () => {
    const request = new Request('http://localhost:3000/api/games/test-game-1?sport=NFL') as NextRequest; // Use NextRequest
    const response = await GET(request, { params: { id: 'test-game-1' } }); // Use id param
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing or invalid sport query parameter (NBA or MLB required)');
  });

  it('should return 404 if OddsApiService cannot find the game', async () => {
    (OddsApiService.prototype.getExternalGameById as jest.Mock).mockResolvedValue(null); // Simulate game not found
    const gameId = 'non-existent-game';
    const sport = 'NBA';
    const request = new Request(`http://localhost:3000/api/games/${gameId}?sport=${sport}`) as NextRequest; // Use NextRequest

    const response = await GET(request, { params: { id: gameId } }); // Use id param
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe(`Game not found with id ${gameId} for sport ${sport}`);
    expect(OddsApiService.prototype.getExternalGameById).toHaveBeenCalledWith(sport, gameId);
  });

  it('should return predictions for a valid request', async () => {
    const sport = 'NBA';
    const request = new Request(`http://localhost:3000/api/games/${mockGame.id}?sport=${sport}`) as NextRequest; // Use NextRequest

    const response = await GET(request, { params: { id: mockGame.id } }); // Use id param
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.data).toEqual(mockSpreadPredictionArray);
    expect(OddsApiService.prototype.getExternalGameById).toHaveBeenCalledWith(sport, mockGame.id);
    expect(PredictionService.getPredictionsForGame).toHaveBeenCalledWith(mockGame); // Ensure service was called with the fetched game
    expect(data).toHaveProperty('predictions');
    expect(data.predictions).toEqual(mockSpreadPredictionArray);
  });

  it('should return 500 if PredictionService fails', async () => {
    const errorMessage = 'Prediction generation failed';
    (PredictionService.getPredictionsForGame as jest.Mock).mockRejectedValue(new Error(errorMessage));
    const sport = 'NBA';
    const request = new Request(`http://localhost:3000/api/games/${mockGame.id}?sport=${sport}`) as NextRequest; // Use NextRequest

    const response = await GET(request, { params: { id: mockGame.id } }); // Use id param
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to process game details'); // Check for generic error message
    expect(OddsApiService.prototype.getExternalGameById).toHaveBeenCalledWith(sport, mockGame.id);
  });

   it('should return 500 if OddsApiService fails unexpectedly', async () => {
    const errorMessage = 'Odds API Error';
    (OddsApiService.prototype.getExternalGameById as jest.Mock).mockRejectedValue(new Error(errorMessage));
    const sport = 'NBA';
    const request = new Request(`http://localhost:3000/api/games/${mockGame.id}?sport=${sport}`) as NextRequest; // Use NextRequest

    const response = await GET(request, { params: { id: mockGame.id } }); // Use id param
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to process game details'); // Check for generic error message
    expect(OddsApiService.prototype.getExternalGameById).toHaveBeenCalledWith(sport, mockGame.id);
    expect(PredictionService.getPredictionsForGame).not.toHaveBeenCalled();
  });

  // Remove obsolete tests related to POST request body 
  // it('should return 400 for missing game', ...) 
  // it('should return 400 for missing type', ...)
  // it('should return 400 for invalid prediction type', ...)

}); 