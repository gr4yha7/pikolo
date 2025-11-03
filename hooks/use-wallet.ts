import { useWalletContext } from '@/contexts/WalletContext';

export function useWallet() {
  const context = useWalletContext();

  // Return wallet interface with backward compatibility
  return {
    wallet: {
      connected: context.wallet.isConnected,
      isConnected: context.wallet.isConnected,
      address: context.wallet.evmAddress,
      evmAddress: context.wallet.evmAddress,
      btcAddress: context.wallet.evmAddress, // Alias for backward compatibility (BTC is native on Mezo)
      balance: context.wallet.musdBalance || context.wallet.evmBalance || context.wallet.btcBalance,
      evmBalance: context.wallet.evmBalance,
      btcBalance: context.wallet.btcBalance,
      musdBalance: context.wallet.musdBalance,
      walletType: context.wallet.walletType,
      isLoading: context.wallet.isLoading,
      error: context.wallet.error,
    },
    connectWallet: context.connectWallet,
    disconnectWallet: context.disconnectWallet,
    formatAddress: context.formatAddress,
    refreshBalances: context.refreshBalances,
  };
}

