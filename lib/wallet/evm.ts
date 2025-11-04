/**
 * EVM wallet connection via WalletConnect/AppKit
 * 
 * Note: These functions are placeholders. Actual wallet connection should be done
 * in React components using the useAppKit() hook from @reown/appkit-react-native.
 * 
 * Example:
 * const { open } = useAppKit();
 * open({ view: 'Networks' });
 */

import { mezoTestnetChain } from '@/constants/chain';
import type { Address } from 'viem';
import { createPublicClient, http } from 'viem';

export interface EVMWallet {
  address: Address;
  chainId: number;
}

type AppKitOpenFunction = (options?: {
  view?: 'Account' | 'Connect' | 'WalletConnect' | 'Networks' | 'Swap' | 'OnRamp';
}) => void;

/**
 * Connect EVM wallet (MetaMask, WalletConnect, etc.)
 * 
 * @param openModal - Function to open AppKit modal (from useAppKit hook)
 * @returns Promise resolving to EVMWallet when connected
 */
export async function connectEVMWallet(
  openModal?: AppKitOpenFunction,
): Promise<EVMWallet> {
  try {
    if (!openModal) {
      throw new Error(
        'openModal function is required. Use useAppKit() hook in your component and pass the open function.',
      );
    }

    // Open AppKit modal to connect EVM wallet
    openModal({ view: 'Connect' });

    // Wait for connection
    // Note: This is a simplified version - actual implementation would need
    // to listen to AppKit events for connection status
    const session = await new Promise<EVMWallet>((resolve, reject) => {
      // Set up event listeners for wallet connection
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);
    });

    return session;
  } catch (error) {
    console.error('Error connecting EVM wallet:', error);
    throw error;
  }
}

/**
 * Get EVM address from connected wallet
 */
export async function getEVMAddress(): Promise<Address | null> {
  try {
    // This would use AppKit's account API
    // For now, return null as placeholder
    return null;
  } catch (error) {
    console.error('Error getting EVM address:', error);
    return null;
  }
}

/**
 * Get EVM balance (BTC on Mezo testnet)
 */
export async function getEVMBalance(address: Address, chainId: number = 31611): Promise<string> {
  try {
    // Only support Mezo testnet
    if (chainId !== 31611) {
      console.warn(`Unsupported chain ID: ${chainId}. Only Mezo testnet (31611) is supported.`);
      return '0';
    }

    const rpcUrl = process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';

    const publicClient = createPublicClient({
      chain: mezoTestnetChain,
      transport: http(rpcUrl),
    });

    const balance = await publicClient.getBalance({ address });
    // Convert from wei (BTC with 18 decimals on Mezo) to BTC
    const nativeBalance = Number(balance) / 1e18;
    return nativeBalance.toFixed(4);
  } catch (error) {
    console.error('Error getting EVM balance:', error);
    return '0';
  }
}

/**
 * Get ERC20 token balance (MUSD, etc.)
 */
export async function getTokenBalance(
  address: Address,
  tokenAddress: Address,
  chainId: number = 31611,
): Promise<string> {
  try {
    // Only support Mezo testnet
    if (chainId !== 31611) {
      console.warn(`Unsupported chain ID: ${chainId}. Only Mezo testnet (31611) is supported.`);
      return '0';
    }

    const rpcUrl = process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';

    const publicClient = createPublicClient({
      chain: mezoTestnetChain,
      transport: http(rpcUrl),
    });

    // Standard ERC20 balanceOf call
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'balanceOf',
      args: [address],
    });

    // Convert from token decimals (assuming 18)
    const tokenBalance = Number(balance) / 1e18;
    return tokenBalance.toFixed(2);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return '0';
  }
}

/**
 * Switch EVM network
 * 
 * @param openModal - Function to open AppKit modal (from useAppKit hook)
 */
export async function switchEVMNetwork(
  chainId: number,
  openModal?: AppKitOpenFunction,
): Promise<void> {
  try {
    if (openModal) {
      // Use AppKit to switch networks
      openModal({ view: 'Networks' });
    } else {
      throw new Error(
        'openModal function is required. Use useAppKit() hook in your component.',
      );
    }
  } catch (error) {
    console.error('Error switching network:', error);
    throw error;
  }
}

/**
 * Disconnect EVM wallet
 * 
 * @param closeModal - Function to close AppKit modal (from useAppKit hook)
 */
export async function disconnectEVMWallet(closeModal?: () => void): Promise<void> {
  try {
    if (closeModal) {
      closeModal();
    }
    // Additional cleanup if needed
  } catch (error) {
    console.error('Error disconnecting EVM wallet:', error);
  }
}

