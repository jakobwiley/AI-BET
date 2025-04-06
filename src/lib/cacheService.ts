import { SportType } from '@/models/types';

// Types for cache entries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface ApiUsage {
  totalCalls: number;
  lastResetDate: string; // ISO string of the first day of the current month
  callsByEndpoint: Record<string, number>;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private apiUsage: ApiUsage;
  private readonly STORAGE_KEY = 'ai_bet_api_cache';
  private readonly USAGE_KEY = 'ai_bet_api_usage';
  private readonly MONTHLY_LIMIT = 500;

  private constructor() {
    // Clear all storage on initialization
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.USAGE_KEY);
      console.log('[CacheService] Cleared all storage on initialization');
    }
    
    this.loadFromStorage();
    this.apiUsage = this.loadApiUsage();
    this.checkAndResetMonthlyCounter();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Get current API usage
  public getApiUsage(): ApiUsage {
    return { ...this.apiUsage };
  }

  // Get remaining API calls
  public getRemainingCalls(): number {
    return Math.max(0, this.MONTHLY_LIMIT - this.apiUsage.totalCalls);
  }

  // Check if we've reached the API limit
  public hasReachedLimit(): boolean {
    return this.apiUsage.totalCalls >= this.MONTHLY_LIMIT;
  }

  // Record an API call
  public recordApiCall(endpoint: string): void {
    this.apiUsage.totalCalls++;
    this.apiUsage.callsByEndpoint[endpoint] = (this.apiUsage.callsByEndpoint[endpoint] || 0) + 1;
    this.saveApiUsage();
  }

  // Get value from cache
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  // Set value in cache with TTL (time to live) in milliseconds
  public set<T>(key: string, data: T, ttl: number): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + ttl;
    
    this.cache.set(key, { 
      data, 
      timestamp, 
      expiresAt 
    });
    
    this.saveToStorage();
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
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.saveToStorage();
    return deleted;
  }

  // Clear the entire cache
  public clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  // Save the cache to localStorage (in browser) or memory (in server)
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      const serializedCache: Record<string, CacheEntry<any>> = {};
      this.cache.forEach((value, key) => {
        serializedCache[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializedCache));
    }
  }

  // Load the cache from localStorage (in browser)
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem(this.STORAGE_KEY);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          Object.keys(parsedData).forEach(key => {
            this.cache.set(key, parsedData[key]);
          });
          
          // Clean expired items
          this.cleanExpiredItems();
        } catch (e) {
          console.error('Failed to parse cached data:', e);
        }
      }
    }
  }

  // Save API usage to localStorage
  private saveApiUsage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USAGE_KEY, JSON.stringify(this.apiUsage));
    }
  }

  // Load API usage from localStorage
  private loadApiUsage(): ApiUsage {
    if (typeof window !== 'undefined') {
      const usageData = localStorage.getItem(this.USAGE_KEY);
      if (usageData) {
        try {
          return JSON.parse(usageData);
        } catch (e) {
          console.error('Failed to parse API usage data:', e);
        }
      }
    }
    
    // Default usage object
    return {
      totalCalls: 0,
      lastResetDate: this.getCurrentMonthStart(),
      callsByEndpoint: {}
    };
  }

  // Check if we need to reset the monthly counter
  private checkAndResetMonthlyCounter(): void {
    const currentMonthStart = this.getCurrentMonthStart();
    
    if (this.apiUsage.lastResetDate !== currentMonthStart) {
      // Reset counter for new month
      this.apiUsage = {
        totalCalls: 0,
        lastResetDate: currentMonthStart,
        callsByEndpoint: {}
      };
      this.saveApiUsage();
    }
  }

  // Get the first day of current month as ISO string
  private getCurrentMonthStart(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  // Clean expired items from cache
  private cleanExpiredItems(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Force refresh specific data
  public forceRefresh(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveToStorage();
    console.log(`[CacheService] Forced refresh for pattern: ${pattern}`);
  }

  // Clear all sports data cache
  public clearSportsData(): void {
    this.forceRefresh('sports_data:');
  }

  // Clear specific sport's cache
  public clearSportCache(sport: SportType): void {
    this.forceRefresh(`sports_data:${sport}`);
  }
} 