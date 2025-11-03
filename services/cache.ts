import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache utilities for storing data offline
 */

const CACHE_KEYS = {
  MARKETS: '@pikolo_cache_markets',
  POSITIONS: '@pikolo_cache_positions',
  MARKET_DETAILS: '@pikolo_cache_market_details',
  USER_DATA: '@pikolo_cache_user_data',
} as const;

const CACHE_EXPIRY = {
  MARKETS: 5 * 60 * 1000, // 5 minutes
  POSITIONS: 2 * 60 * 1000, // 2 minutes
  MARKET_DETAILS: 10 * 60 * 1000, // 10 minutes
  USER_DATA: 60 * 60 * 1000, // 1 hour
} as const;

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Store data in cache with timestamp
 */
export async function setCache<T>(key: string, data: T, expiryMs?: number): Promise<void> {
  try {
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiry: expiryMs || CACHE_EXPIRY.USER_DATA,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error setting cache for ${key}:`, error);
  }
}

/**
 * Get data from cache if not expired
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const cacheData: CachedData<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - cacheData.timestamp;

    if (age > cacheData.expiry) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.error(`Error getting cache for ${key}:`, error);
    return null;
  }
}

/**
 * Remove specific cache entry
 */
export async function removeCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing cache for ${key}:`, error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    await Promise.all(
      Object.values(CACHE_KEYS).map((key) => AsyncStorage.removeItem(key)),
    );
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Cache markets data
 */
export async function cacheMarkets(markets: any[]): Promise<void> {
  await setCache(CACHE_KEYS.MARKETS, markets, CACHE_EXPIRY.MARKETS);
}

/**
 * Get cached markets
 */
export async function getCachedMarkets(): Promise<any[] | null> {
  return getCache<any[]>(CACHE_KEYS.MARKETS);
}

/**
 * Cache positions data
 */
export async function cachePositions(positions: any[]): Promise<void> {
  await setCache(CACHE_KEYS.POSITIONS, positions, CACHE_EXPIRY.POSITIONS);
}

/**
 * Get cached positions
 */
export async function getCachedPositions(): Promise<any[] | null> {
  return getCache<any[]>(CACHE_KEYS.POSITIONS);
}

/**
 * Cache market details
 */
export async function cacheMarketDetails(marketId: string, details: any): Promise<void> {
  const key = `${CACHE_KEYS.MARKET_DETAILS}_${marketId}`;
  await setCache(key, details, CACHE_EXPIRY.MARKET_DETAILS);
}

/**
 * Get cached market details
 */
export async function getCachedMarketDetails(marketId: string): Promise<any | null> {
  const key = `${CACHE_KEYS.MARKET_DETAILS}_${marketId}`;
  return getCache<any>(key);
}

