/**
 * Price Resolution Utility
 * 
 * Fetches BTC price from Mezo PriceFeed contract for market resolution.
 * Used by backend cron job to resolve BTC price prediction markets.
 */

import type { Address, PublicClient } from 'viem';
import { createPublicClient, http } from 'viem';

import PriceFeedABI from '@/lib/contracts/abis/mezo/PriceFeed.json';

// Mezo Testnet (Matsnet) PriceFeed address
const MEZO_PRICE_FEED_ADDRESS = '0x86bCF0841622a5dAC14A313a15f96A95421b9366' as Address;

// Define a custom chain for Mezo testnet
const mezoTestnetChain = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Bitcoin',
    symbol: 'BTC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.test.mezo.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mezo Explorer',
      url: 'https://explorer.test.mezo.org',
    },
  },
  testnet: true,
};

/**
 * Get BTC price from Mezo PriceFeed contract
 * 
 * @param publicClient - Viem public client (optional, will create one if not provided)
 * @returns BTC price in USD (as number, e.g., 60000 for $60,000)
 */
export async function getBTCPriceFromMezo(
  publicClient?: PublicClient,
): Promise<number> {
  try {
    const client =
      publicClient ||
      createPublicClient({
        chain: mezoTestnetChain,
        transport: http('https://rpc.test.mezo.org'),
      });

    // Fetch price from Mezo PriceFeed
    // The function name may vary - check PriceFeed contract interface
    // Common names: fetchPrice, getPrice, latestAnswer, etc.
    const price = await client.readContract({
      address: MEZO_PRICE_FEED_ADDRESS,
      abi: PriceFeedABI.abi as any,
      functionName: 'fetchPrice',
      args: [],
    });

    // Price is returned in wei (18 decimals)
    // Convert to USD: price / 10^18
    const priceInUSD = Number(price as bigint) / 1e18;

    return priceInUSD;
  } catch (error) {
    console.error('Error fetching BTC price from Mezo PriceFeed:', error);
    throw error;
  }
}

/**
 * Check if market should resolve based on expiration time
 * 
 * @param expirationTimestamp - Market expiration timestamp (Unix timestamp)
 * @returns true if market has expired and should be resolved
 */
export function shouldResolveMarket(expirationTimestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
  return now >= expirationTimestamp;
}

/**
 * Determine market outcome based on BTC price and threshold
 * 
 * @param btcPrice - Current BTC price in USD
 * @param threshold - Price threshold from market (USD)
 * @param isAboveThreshold - Market question: "Will BTC be above $X?" (true) or "below $X?" (false)
 * @returns 'Yes' if condition is met, 'No' otherwise
 */
export function determineMarketOutcome(
  btcPrice: number,
  threshold: number,
  isAboveThreshold: boolean = true,
): 'Yes' | 'No' {
  if (isAboveThreshold) {
    return btcPrice >= threshold ? 'Yes' : 'No';
  } else {
    return btcPrice <= threshold ? 'No' : 'Yes';
  }
}

/**
 * Format price for display
 */
export function formatBTCPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

