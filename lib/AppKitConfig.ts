import '@walletconnect/react-native-compat';
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
// Note: Bitcoin network support removed - focusing on Mezo testnet (matsnet) and Sepolia
// import { BitcoinAdapter } from '@reown/appkit-bitcoin-react-native';
// import { EthersAdapter } from '@reown/appkit-ethers-react-native';
import { mezoTestnetChain } from '@/constants/chain';
import { createAppKit, type Storage } from '@reown/appkit-react-native';
import { WagmiAdapter } from '@reown/appkit-wagmi-react-native';
import { safeJsonParse, safeJsonStringify } from '@walletconnect/safe-json';
import { Platform } from 'react-native';
import { sepolia } from 'viem/chains';

const storage: Storage =
  Platform.OS !== 'web'
    ? {
        getKeys: async () => {
          return (await AsyncStorage.getAllKeys()) as string[];
        },
        getEntries: async <T = any>(): Promise<[string, T][]> => {
          const keys = await AsyncStorage.getAllKeys();
          return await Promise.all(
            keys.map(async (key) => [
              key,
              safeJsonParse((await AsyncStorage.getItem(key)) ?? '') as T,
            ]),
          );
        },
        setItem: async <T = any>(key: string, value: T) => {
          await AsyncStorage.setItem(key, safeJsonStringify(value));
        },
        getItem: async <T = any>(key: string): Promise<T | undefined> => {
          const item = await AsyncStorage.getItem(key);
          if (typeof item === 'undefined' || item === null) {
            return undefined;
          }
          return safeJsonParse(item) as T;
        },
        removeItem: async (key: string) => {
          await AsyncStorage.removeItem(key);
        },
      }
    : {
        getKeys: async () => [],
        getEntries: async () => [],
        getItem: async () => undefined,
        setItem: async () => {},
        removeItem: async () => {},
      };

const projectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error('EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in environment variables');
}

// BitcoinAdapter removed - focusing on EVM chains (Mezo testnet and Sepolia)
// const bitcoinAdapter = new BitcoinAdapter();
// const ethersAdapter = new EthersAdapter();

// Mezo Testnet (Matsnet) - Chain ID: 31611
// This is where Mezo protocol contracts are deployed



// Create a viem chain object for WagmiAdapter
const mezoTestnetViemChain = {
  id: mezoTestnetChain.id,
  name: mezoTestnetChain.name,
  nativeCurrency: mezoTestnetChain.nativeCurrency,
  rpcUrls: mezoTestnetChain.rpcUrls,
  blockExplorers: mezoTestnetChain.blockExplorers,
  testnet: mezoTestnetChain.testnet,
} as const;

// Sepolia Testnet (Chain ID: 11155111) - For Ethereum testnet support
// const sepoliaRpcUrl =
//   process.env.EXPO_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';

// export const sepolia: AppKitNetwork = {
//   id: 'eip155:11155111',
//   caipNetworkId: 'eip155:11155111',
//   chainNamespace: 'eip155',
//   name: 'Sepolia',
//   nativeCurrency: {
//     name: 'Ether',
//     symbol: 'ETH',
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: {
//       http: [sepoliaRpcUrl],
//     },
//   },
//   testnet: true,
// };

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mezoTestnetViemChain, sepolia], // Use viem chain objects for WagmiAdapter
});

const metadata = {
  name: 'Pikolo',
  description: 'Bitcoin-Backed Predictions Market on Mezo',
  url: 'https://pikolo.app',
  icons: ['https://pikolo.app/icon.png'],
  redirect: {
    native: 'pikolo://',
  },
};

export const appKit = createAppKit({
  adapters: [wagmiAdapter], // Removed bitcoinAdapter - focusing on EVM chains
  networks: [mezoTestnetViemChain, sepolia], // Mezo testnet (matsnet) is primary
  defaultNetwork: mezoTestnetViemChain, // Default to Mezo testnet
  projectId,
  metadata,
  storage,
  debug: __DEV__,
});

