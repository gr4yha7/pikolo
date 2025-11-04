/**
 * Market Metadata Storage
 * 
 * Stores market metadata that isn't stored on-chain (like isAboveThreshold)
 * Uses AsyncStorage for persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Address } from 'viem';

const MARKET_METADATA_KEY = 'market_metadata';

interface MarketMetadata {
  [marketAddress: string]: {
    isAboveThreshold: boolean;
  };
}

/**
 * Get metadata for a specific market
 */
export async function getMarketMetadata(marketAddress: Address): Promise<{ isAboveThreshold: boolean } | null> {
  try {
    const data = await AsyncStorage.getItem(MARKET_METADATA_KEY);
    if (!data) return null;
    
    const metadata: MarketMetadata = JSON.parse(data);
    return metadata[marketAddress.toLowerCase()] || null;
  } catch (error) {
    console.error('Error getting market metadata:', error);
    return null;
  }
}

/**
 * Set metadata for a specific market
 */
export async function setMarketMetadata(
  marketAddress: Address,
  metadata: { isAboveThreshold: boolean },
): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(MARKET_METADATA_KEY);
    const existingMetadata: MarketMetadata = data ? JSON.parse(data) : {};
    
    existingMetadata[marketAddress.toLowerCase()] = metadata;
    
    await AsyncStorage.setItem(MARKET_METADATA_KEY, JSON.stringify(existingMetadata));
  } catch (error) {
    console.error('Error setting market metadata:', error);
  }
}

/**
 * Get isAboveThreshold for a market (defaults to true if not found)
 */
export async function getMarketIsAboveThreshold(marketAddress: Address): Promise<boolean> {
  const metadata = await getMarketMetadata(marketAddress);
  return metadata?.isAboveThreshold ?? true; // Default to true (above) for backwards compatibility
}

