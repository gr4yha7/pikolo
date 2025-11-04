/**
 * Hook for Mezo protocol interactions
 */

import { MezoClient } from '@/lib/mezo/MezoClient';
import type { CollateralInfo } from '@/lib/mezo/types';
import { useAccount } from '@reown/appkit-react-native';
import { useEffect, useState } from 'react';
import type { Address, WalletClient } from 'viem';
import { useWalletClient } from 'wagmi';

export function useMezo() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [mezoClient, setMezoClient] = useState<MezoClient | null>(null);
  const [collateralInfo, setCollateralInfo] = useState<CollateralInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Mezo client
  useEffect(() => {
    if (!isConnected || !address) {
      setMezoClient(null);
      return;
    }

    // Get Mezo contract addresses from environment variables
    // Default to Matsnet (testnet) addresses if not set
    const borrowerOperationsAddress =
      process.env.EXPO_PUBLIC_MEZO_BORROWER_OPERATIONS_ADDRESS ||
      '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5';
    const troveManagerAddress =
      process.env.EXPO_PUBLIC_MEZO_TROVE_MANAGER_ADDRESS ||
      '0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0';
    const musdAddress =
      process.env.EXPO_PUBLIC_MEZO_MUSD_ADDRESS || '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
    const hintHelpersAddress =
      process.env.EXPO_PUBLIC_MEZO_HINT_HELPERS_ADDRESS ||
      '0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6';
    const sortedTrovesAddress =
      process.env.EXPO_PUBLIC_MEZO_SORTED_TROVES_ADDRESS ||
      '0x722E4D24FD6Ff8b0AC679450F3D91294607268fA';
    const priceFeedAddress =
      process.env.EXPO_PUBLIC_MEZO_PRICE_FEED_ADDRESS ||
      '0x86bCF0841622a5dAC14A313a15f96A95421b9366';
    const chainId = parseInt(process.env.EXPO_PUBLIC_CHAIN_ID || '31611'); // Default to Matsnet

    const client = new MezoClient({
      borrowerOperationsAddress: borrowerOperationsAddress as Address,
      troveManagerAddress: troveManagerAddress as Address,
      musdAddress: musdAddress as Address,
      hintHelpersAddress: hintHelpersAddress as Address,
      sortedTrovesAddress: sortedTrovesAddress as Address,
      priceFeedAddress: priceFeedAddress as Address,
      chainId,
    });

    // Set wallet client if available (for write operations)
    if (walletClient) {
      client.setWalletClient(walletClient as WalletClient);
    }

    setMezoClient(client);
  }, [address, isConnected, walletClient]);

  // Fetch collateral info
  const fetchCollateralInfo = async () => {
    if (!mezoClient || !address) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const info = await mezoClient.getCollateralInfo(address as Address);
      setCollateralInfo(info);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collateral info';
      setError(errorMessage);
      console.error('Error fetching collateral info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update wallet client when it becomes available
  useEffect(() => {
    if (mezoClient && walletClient) {
      mezoClient.setWalletClient(walletClient as WalletClient);
    }
  }, [mezoClient, walletClient]);

  // Fetch collateral info when client is ready
  useEffect(() => {
    if (mezoClient && address) {
      fetchCollateralInfo();
    }
  }, [mezoClient, address]);

  return {
    mezoClient,
    collateralInfo,
    isLoading,
    error,
    refetch: fetchCollateralInfo,
  };
}

