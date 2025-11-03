import { useAppKit } from '@reown/appkit-react-native';

import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
// Note: Bitcoin wallet connection removed - Mezo uses EVM-compatible chain
// BTC is the native currency on Mezo network, so we get BTC balance via native currency
// import { connectBitcoinWallet, getBitcoinBalance } from '@/lib/wallet/bitcoin';
import { connectEVMWallet, getEVMBalance, getTokenBalance } from '@/lib/wallet/evm';
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
import React, { createContext, ReactNode, useContext, useEffect } from 'react';

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
  const { open } = useAppKit();

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

  const connectWallet = async (type: 'evm' = 'evm') => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      // Connect EVM wallet (Mezo testnet uses EVM-compatible chain)
      const evmWallet = await connectEVMWallet(
        open as (options?: {
          view?: 'Account' | 'Connect' | 'WalletConnect' | 'Networks' | 'Swap' | 'OnRamp';
        }) => void,
      );

      // Get native balance (BTC on Mezo network)
      const balance = await getEVMBalance(evmWallet.address, evmWallet.chainId);

      dispatch(
        connectEVM({
          address: evmWallet.address,
          balance,
        }),
      );

      // Fetch MUSD token balance
      const musdAddress =
        process.env.EXPO_PUBLIC_MEZO_MUSD_ADDRESS ||
        '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503'; // Default to Matsnet address
      if (musdAddress) {
        try {
          const musdBalance = await getTokenBalance(
            evmWallet.address,
            musdAddress as `0x${string}`,
            evmWallet.chainId,
          );
          dispatch(updateMUSDBalance(musdBalance));
        } catch (error) {
          console.error('Error fetching MUSD balance:', error);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      dispatch(setError(errorMessage));
      throw error;
    }
  };

  const disconnectWallet = () => {
    dispatch(disconnect());
  };

  const formatAddress = (address: string | null) => {
    return formatAddressUtil(address);
  };

  const refreshBalances = async () => {
    try {
      // On Mezo, BTC is the native currency, so we get it via EVM balance
      if (walletState.evmAddress && walletState.evmAddress.startsWith('0x')) {
        const evmAddress = walletState.evmAddress as `0x${string}`;
        
        // Get native BTC balance (native currency on Mezo network)
        const evmBalance = await getEVMBalance(evmAddress);
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
            );
            dispatch(updateMUSDBalance(musdBalance));
          } catch (error) {
            console.error('Error refreshing MUSD balance:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
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

