import axios from 'axios';
import { OddsApiService } from '@/lib/oddsApi';
import { getMockApiEventData } from '@/lib/testUtils'; // Assuming this helper exists now

// Mock the entire axios library
jest.mock('axios');
const mockedAxiosGet = axios.get as jest.Mock;

describe('OddsApiService', () => {
  let oddsService: OddsApiService;
  const apiKey = 'test-key';
  const baseUrl = 'http://test.com';

  beforeEach(() => {
    oddsService = new OddsApiService(apiKey, baseUrl);
    mockedAxiosGet.mockClear(); // Clear mocks between tests
  });

  it('should fetch and parse upcoming games for NBA', async () => {
    const mockApiResponse = getMockApiEventData('NBA');
    mockedAxiosGet.mockResolvedValue({ data: mockApiResponse });

    const games = await oddsService.getUpcomingGames('NBA');

    expect(mockedAxiosGet).toHaveBeenCalledWith(
      `${baseUrl}/sports/basketball_nba/odds`,
      expect.objectContaining({
        headers: { 'X-API-Key': apiKey },
        params: expect.objectContaining({ apiKey: apiKey, markets: 'h2h,spreads,totals' })
      })
    );

    expect(games).toBeInstanceOf(Array);
    expect(games.length).toBe(mockApiResponse.length);
    expect(games[0]).toHaveProperty('id', mockApiResponse[0].id);
    expect(games[0]).toHaveProperty('sport', 'NBA');
    expect(games[0]).toHaveProperty('homeTeamName', mockApiResponse[0].home_team);
    expect(games[0].odds?.spread).toBeDefined();
    expect(games[0].odds?.total).toBeDefined();
    expect(games[0].odds?.moneyline).toBeDefined();
    // Add more specific odds value checks if needed based on mock data
  });
  
  it('should fetch and parse upcoming games for MLB', async () => {
    const mockApiResponse = getMockApiEventData('MLB');
    mockedAxiosGet.mockResolvedValue({ data: mockApiResponse });

    const games = await oddsService.getUpcomingGames('MLB');

    expect(mockedAxiosGet).toHaveBeenCalledWith(
      `${baseUrl}/sports/baseball_mlb/odds`,
      expect.objectContaining({
        headers: { 'X-API-Key': apiKey },
        params: expect.objectContaining({ apiKey: apiKey, markets: 'h2h,spreads,totals' })
      })
    );
    expect(games).toBeInstanceOf(Array);
    expect(games.length).toBe(mockApiResponse.length);
    expect(games[0]).toHaveProperty('sport', 'MLB');
  });

  it('should return empty array if API call fails for getUpcomingGames', async () => {
    mockedAxiosGet.mockRejectedValue(new Error('Network Error'));
    const games = await oddsService.getUpcomingGames('NBA');
    expect(games).toEqual([]);
  });

  it('should return empty array if API response is not an array for getUpcomingGames', async () => {
    mockedAxiosGet.mockResolvedValue({ data: { message: 'Invalid response'} }); // Not an array
    const games = await oddsService.getUpcomingGames('NBA');
    expect(games).toEqual([]);
  });

  // --- Tests for getExternalGameById ---
  it('should fetch a single external game by ID', async () => {
    const mockGameId = 'test-game-id-123';
    const mockApiResponse = getMockApiEventData('NBA')[0]; // Use a single event
    mockedAxiosGet.mockResolvedValue({ data: mockApiResponse });

    const game = await oddsService.getExternalGameById('NBA', mockGameId);

    expect(mockedAxiosGet).toHaveBeenCalledWith(
      `${baseUrl}/sports/basketball_nba/events/${mockGameId}/odds`,
      expect.objectContaining({
         headers: { 'X-API-Key': apiKey },
         params: expect.objectContaining({ apiKey: apiKey, markets: 'h2h,spreads,totals' })
      })
    );
    expect(game).toBeDefined();
    expect(game?.id).toBe(mockApiResponse.id);
    expect(game?.sport).toBe('NBA');
    expect(game?.odds?.spread).toBeDefined();
  });

  it('should return null if external game fetch fails', async () => {
    const mockGameId = 'test-game-id-404';
    mockedAxiosGet.mockRejectedValue(new Error('API Error 404'));

    const game = await oddsService.getExternalGameById('NBA', mockGameId);

    expect(game).toBeNull();
    expect(mockedAxiosGet).toHaveBeenCalledWith(
       expect.stringContaining(`/events/${mockGameId}/odds`), // Verify correct endpoint structure
       expect.any(Object)
     );
  });
  
  it('should return null if external game fetch returns no data', async () => {
    const mockGameId = 'test-game-id-nodata';
    mockedAxiosGet.mockResolvedValue({ data: null }); // Simulate empty response

    const game = await oddsService.getExternalGameById('NBA', mockGameId);

    expect(game).toBeNull();
  });
  
  it('should return null for unsupported sport in getExternalGameById', async () => {
    const game = await oddsService.getExternalGameById('NFL' as any, 'some-id'); // Cast as any to bypass TS
    expect(game).toBeNull();
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });
  
  it('should return null for unsupported sport in getUpcomingGames', async () => {
    const games = await oddsService.getUpcomingGames('NFL' as any);
    expect(games).toEqual([]);
    expect(mockedAxiosGet).not.toHaveBeenCalled();
  });

}); 