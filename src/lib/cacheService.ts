import { SportType } from '../models/types.js';

// Types for cache entries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface ApiUsage {
  used: number;
  limit: number;
  lastResetDate: Date;
}

export class CacheService {
  private static readonly cache: Map<string, CacheEntry<any>> = new Map();
  private static instance: CacheService;
  private static apiCalls: Map<string, number> = new Map();
  private static apiUsage: ApiUsage;
  private static readonly STORAGE_KEY = 'ai_bet_api_cache';
  private static readonly USAGE_KEY = 'ai_bet_api_usage';
  private static readonly MONTHLY_LIMIT = 500;

  private constructor() {
    // Clear all storage on initialization
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    CacheService.apiUsage = {
      used: 0,
      limit: CacheService.MONTHLY_LIMIT,
      lastResetDate: new Date()
    };
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Get current API usage
  public static getApiUsage(): ApiUsage {
    return { ...CacheService.apiUsage };
  }

  // Get remaining API calls
  public static getRemainingCalls(): number {
    return Math.max(0, CacheService.MONTHLY_LIMIT - CacheService.apiUsage.used);
  }

  // Check if we've reached the API limit
  public static hasReachedLimit(): boolean {
    return CacheService.apiUsage.used >= CacheService.MONTHLY_LIMIT;
  }

  // Record an API call
  public static recordApiCall(endpoint: string): void {
    const count = CacheService.apiCalls.get(endpoint) || 0;
    CacheService.apiCalls.set(endpoint, count + 1);
    CacheService.apiUsage.used++;
    CacheService.saveApiUsage();
  }

  /**
   * Get a value from the cache
   */
  public static async get<T>(key: string): Promise<T | null> {
    const entry = CacheService.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > 3600000) { // 1 hour default
      CacheService.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in the cache
   */
  public static async set<T>(key: string, value: T, duration: number = 3600000): Promise<void> {
    CacheService.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear a specific key from the cache
   */
  public static async clear(key: string): Promise<void> {
    CacheService.cache.delete(key);
  }

  /**
   * Clear all expired entries from the cache
   */
  public static async clearExpired(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of CacheService.cache.entries()) {
      if (now - entry.timestamp > 3600000) {
        CacheService.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  public static async clearAll(): Promise<void> {
    CacheService.cache.clear();
  }

  // Get cache key for sports data
  public static getSportsDataKey(endpoint: string, sport: SportType, id?: string): string {
    return `sports_data:${endpoint}:${sport}${id ? `:${id}` : ''}`;
  }

  // Calculate appropriate TTL based on game time
  public static calculateTTL(gameTime?: string): number {
    if (!gameTime) {
      return 30 * 60 * 1000; // Default 30 minutes
    }
    
    const gameDate = new Date(gameTime);
    const now = new Date();
    const hoursUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // More aggressive TTL strategy:
    // - More than 1 week away: 12 hours
    // - 1-7 days away: 6 hours
    // - 24-48 hours away: 4 hours
    // - 12-24 hours away: 2 hours
    // - 6-12 hours away: 1 hour
    // - 3-6 hours away: 30 minutes
    // - 1-3 hours away: 15 minutes
    // - Less than 1 hour: 5 minutes
    // - Game in progress: 2 minutes
    
    if (hoursUntilGame < 0) {
      return 2 * 60 * 1000; // Game in progress: 2 minutes
    } else if (hoursUntilGame < 1) {
      return 5 * 60 * 1000; // Less than 1 hour: 5 minutes
    } else if (hoursUntilGame < 3) {
      return 15 * 60 * 1000; // 1-3 hours: 15 minutes
    } else if (hoursUntilGame < 6) {
      return 30 * 60 * 1000; // 3-6 hours: 30 minutes
    } else if (hoursUntilGame < 12) {
      return 60 * 60 * 1000; // 6-12 hours: 1 hour
    } else if (hoursUntilGame < 24) {
      return 2 * 60 * 60 * 1000; // 12-24 hours: 2 hours
    } else if (hoursUntilGame < 48) {
      return 4 * 60 * 60 * 1000; // 24-48 hours: 4 hours
    } else if (hoursUntilGame < 168) {
      return 6 * 60 * 60 * 1000; // 1-7 days: 6 hours
    } else {
      return 12 * 60 * 60 * 1000; // More than 1 week: 12 hours
    }
  }

  // Delete an item from cache
  public static delete(key: string): void {
    CacheService.cache.delete(key);
  }

  // Save the cache to localStorage (in browser) or memory (in server)
  private static saveToStorage(): void {
    if (typeof window !== 'undefined') {
      const serializedCache: Record<string, CacheEntry<any>> = {};
      CacheService.cache.forEach((value, key) => {
        serializedCache[key] = value;
      });
      localStorage.setItem(CacheService.STORAGE_KEY, JSON.stringify(serializedCache));
    }
  }

  // Load the cache from localStorage (in browser)
  private static loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem(CacheService.STORAGE_KEY);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          Object.keys(parsedData).forEach(key => {
            CacheService.cache.set(key, parsedData[key]);
          });
          
          // Clean expired items
          CacheService.cleanExpiredEntries();
        } catch (e) {
          console.error('Failed to parse cached data:', e);
        }
      }
    }
  }

  private static saveApiUsage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CacheService.USAGE_KEY, JSON.stringify(CacheService.apiUsage));
    }
  }

  private static loadApiUsage(): ApiUsage {
    if (typeof window !== 'undefined') {
      const usage = localStorage.getItem(CacheService.USAGE_KEY);
      if (usage) {
        try {
          return JSON.parse(usage);
        } catch (e) {
          console.error('Failed to parse API usage data:', e);
        }
      }
    }
    return {
      used: 0,
      limit: CacheService.MONTHLY_LIMIT,
      lastResetDate: new Date()
    };
  }

  private static checkAndResetMonthlyCounter(): void {
    const currentMonth = CacheService.getCurrentMonthStart();
    if (currentMonth > CacheService.apiUsage.lastResetDate) {
      CacheService.apiUsage = {
        used: 0,
        limit: CacheService.MONTHLY_LIMIT,
        lastResetDate: currentMonth
      };
      CacheService.saveApiUsage();
    }
  }

  private static getCurrentMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private static cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of CacheService.cache.entries()) {
      if (now - entry.timestamp > 3600000) {
        CacheService.cache.delete(key);
      }
    }
  }

  public static forceRefresh(pattern: string): void {
    for (const key of CacheService.cache.keys()) {
      if (key.includes(pattern)) {
        CacheService.cache.delete(key);
      }
    }
  }

  public static clearSportsData(): void {
    for (const key of CacheService.cache.keys()) {
      if (key.startsWith('sports_data:')) {
        CacheService.cache.delete(key);
      }
    }
  }

  public static clearSportCache(sport: SportType): void {
    CacheService.forceRefresh(`sports_data:${sport}`);
  }

  public static has(key: string): boolean {
    return CacheService.cache.has(key);
  }

  public static size(): number {
    return CacheService.cache.size;
  }

  public static getApiCallCount(endpoint: string): number {
    return CacheService.apiCalls.get(endpoint) || 0;
  }

  public static clearApiCalls(): void {
    CacheService.apiCalls.clear();
  }
} 