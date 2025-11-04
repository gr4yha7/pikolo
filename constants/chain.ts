/**
 * Mezo Testnet Chain Configuration
 * 
 * Single source of truth for Mezo testnet chain configuration
 * Used across the app for viem PublicClient and WalletClient creation
 */

export const mezoTestnetChain = {
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
} as const;

export const MEZO_TESTNET_CHAIN_ID = 31611;
export const MEZO_TESTNET_RPC_URL = 'https://rpc.test.mezo.org';

