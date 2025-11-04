import { useAccount, useAppKit } from '@reown/appkit-react-native';

import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
// Note: Bitcoin wallet connection removed - Mezo uses EVM-compatible chain
// BTC is the native currency on Mezo network, so we get BTC balance via native currency
// import { connectBitcoinWallet, getBitcoinBalance } from '@/lib/wallet/bitcoin';
import { getEVMBalance, getTokenBalance } from '@/lib/wallet/evm';
import {
  // connectBitcoin, // Removed - no separate Bitcoin wallet
  connectEVM,
  disconnect,
  loadWalletState,
  restoreWalletState,
  setError,
  setLoading,
  updateEVMBalance,
  updateMUSDBalance,
} from '@/store/slices/walletSlice';
import { formatAddress as formatAddressUtil } from '@/utils/formatting';
import React, { createContext, ReactNode, useCallback, useContext, useEffect } from 'react';
import type { Address } from 'viem';

interface WalletContextType {
  wallet: {
    evmAddress: string | null; // EVM address (on Mezo testnet, this is the wallet address)
    btcBalance: string | null; // Native BTC balance on Mezo network (native currency)
    evmBalance: string | null; // Same as btcBalance (native currency)
    musdBalance: string | null; // MUSD token balance (ERC20)
    isConnected: boolean;
    walletType: 'evm' | null; // Only EVM wallets supported now
    isLoading: boolean;
    error: string | null;
  };
  connectWallet: (type?: 'evm') => Promise<void>; // Only EVM supported
  disconnectWallet: () => void;
  formatAddress: (address: string | null) => string;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const walletState = useAppSelector((state) => state.wallet);
  const { open, disconnect: disconnectAppKit } = useAppKit();
  const { address, isConnected, chainId } = useAccount();

  // Load wallet state from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      const savedState = await loadWalletState();
      if (Object.keys(savedState).length > 0) {
        dispatch(restoreWalletState(savedState));
      }
    };
    loadState();
  }, [dispatch]);

  const refreshBalances = useCallback(async () => {
    try {
      // Use current connected address from AppKit, or fall back to wallet state
      const currentAddress = address || walletState.evmAddress;
      
      if (currentAddress && typeof currentAddress === 'string' && currentAddress.startsWith('0x')) {
        const evmAddress = currentAddress as `0x${string}`;
        // Ensure chainId is a number
        const currentChainId = typeof chainId === 'number' ? chainId : 31611; // Default to Mezo testnet
        
        // Get native BTC balance (native currency on Mezo network)
        const evmBalance = await getEVMBalance(evmAddress, currentChainId);
        dispatch(updateEVMBalance(evmBalance));

        // Refresh MUSD token balance
        const musdAddress =
          process.env.EXPO_PUBLIC_MEZO_MUSD_ADDRESS ||
          '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
        if (musdAddress && musdAddress.startsWith('0x')) {
          try {
            const musdBalance = await getTokenBalance(
              evmAddress,
              musdAddress as `0x${string}`,
              currentChainId,
            );
            dispatch(updateMUSDBalance(musdBalance));
          } catch (error) {
            console.error('Error refreshing MUSD balance:', error);
          }
        }
        
        dispatch(setLoading(false));
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
      dispatch(setLoading(false));
    }
  }, [address, chainId, walletState.evmAddress, dispatch]);

  // Listen to AppKit connection events and update wallet state
  useEffect(() => {
    if (isConnected && address) {
      // Wallet connected - update state only if not already connected with this address
      if (!walletState.isConnected || walletState.evmAddress !== address) {
        dispatch(setLoading(true));
        dispatch(
          connectEVM({
            address: address as Address,
            balance: walletState.evmBalance || '0', // Will be updated by refreshBalances
          }),
        );

        // Fetch balances
        refreshBalances();
      }
    } else if (!isConnected && walletState.isConnected) {
      // Wallet disconnected - clear state
      dispatch(disconnect());
    }
  }, [isConnected, address, walletState.isConnected, walletState.evmAddress, refreshBalances, dispatch]);

  const connectWallet = useCallback(async (type: 'evm' = 'evm') => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      console.log('Opening AppKit connect modal...');
      
      // Open AppKit modal for wallet connection
      // Try opening with different approaches to ensure modal shows
      try {
        open({ view: 'Connect' });
      } catch (openError) {
        console.error('Error opening AppKit modal:', openError);
        // Fallback: try opening Account view which should also show connect option
        open({ view: 'Account' });
      }
      
      // Don't wait here - let the useEffect above handle the connection status
      // The modal will handle the connection flow, and useAccount will update
      // Note: Loading state will be cleared when connection succeeds or fails
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      console.error('Error in connectWallet:', error);
      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
      throw error;
    }
  }, [open, dispatch]);

  const disconnectWallet = useCallback(() => {
    // Disconnect from AppKit first
    disconnectAppKit();
    dispatch(disconnect());
  }, [dispatch]);

  const formatAddress = (address: string | null) => {
    return formatAddressUtil(address);
  };

  return (
    <WalletContext.Provider
      value={{
        wallet: {
          ...walletState,
          // walletType is already 'evm' | null from WalletState
          // No need to map 'bitcoin' since it's removed from the type
        },
        connectWallet,
        disconnectWallet,
        formatAddress,
        refreshBalances,
      }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}

