/**
 * Close Trove Screen - Close trove by repaying all debt and withdrawing all collateral
 */

import { AppHeader } from '@/components/app-header';
import { CollateralHealth } from '@/components/collateral-health';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mezoTestnetChain } from '@/constants/chain';
import { MUSD_ADDRESS } from '@/constants/swap';
import { DesignColors, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMezo } from '@/hooks/useMezo';
import MUSDABI from '@/lib/contracts/abis/mezo/MUSD.json';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createPublicClient, http, maxUint256, parseEther, type Address } from 'viem';
import { useWalletClient } from 'wagmi';

const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export default function CloseTroveScreen() {
  const router = useRouter();
  const { wallet, refreshBalances } = useWallet();
  const { mezoClient, collateralInfo, isLoading: mezoLoading, refetch } = useMezo();
  const { data: walletClient } = useWalletClient();
  const [isClosing, setIsClosing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [musdBalance, setMusdBalance] = useState('0');
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));

  // Get BorrowerOperations address from Mezo config
  const borrowerOperationsAddress =
    process.env.EXPO_PUBLIC_MEZO_BORROWER_OPERATIONS_ADDRESS ||
    '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5';

  // Fetch MUSD balance and allowance
  useEffect(() => {
    const fetchBalanceAndAllowance = async () => {
      if (!wallet.evmAddress || !mezoClient) return;

      try {
        const rpcUrl =
          process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';
        const publicClient = createPublicClient({
          chain: mezoTestnetChain,
          transport: http(rpcUrl),
        });

        // Get MUSD balance
        const balance = await publicClient.readContract({
          address: MUSD_ADDRESS,
          abi: MUSDABI.abi as any,
          functionName: 'balanceOf',
          args: [wallet.evmAddress as Address],
        });
        setMusdBalance((Number(balance) / 1e18).toFixed(2));

        // Get allowance
        const currentAllowance = await publicClient.readContract({
          address: MUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [wallet.evmAddress as Address, borrowerOperationsAddress as Address],
        });
        setAllowance(currentAllowance as bigint);
      } catch (error) {
        console.error('Error fetching balance/allowance:', error);
      }
    };

    fetchBalanceAndAllowance();
  }, [wallet.evmAddress, mezoClient, borrowerOperationsAddress]);

  const handleApprove = async () => {
    if (!walletClient?.account) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    setIsApproving(true);
    try {
      const hash = await walletClient.writeContract({
        address: MUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [borrowerOperationsAddress as Address, maxUint256],
        account: walletClient.account,
        chain: mezoTestnetChain,
      });

      const rpcUrl =
        process.env.EXPO_PUBLIC_MEZO_TESTNET_RPC_URL || 'https://rpc.test.mezo.org';
      const publicClient = createPublicClient({
        chain: mezoTestnetChain,
        transport: http(rpcUrl),
      });

      await publicClient.waitForTransactionReceipt({ hash });

      // Update allowance
      const newAllowance = await publicClient.readContract({
        address: MUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [wallet.evmAddress as Address, borrowerOperationsAddress as Address],
      });
      setAllowance(newAllowance as bigint);

      Alert.alert('Success', 'MUSD approval successful');
    } catch (error) {
      console.error('Error approving MUSD:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to approve MUSD';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCloseTrove = async () => {
    if (!wallet.isConnected || !wallet.evmAddress) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    if (!mezoClient) {
      Alert.alert('Error', 'Mezo client not initialized');
      return;
    }

    if (!collateralInfo) {
      Alert.alert('Error', 'No active trove found');
      return;
    }

    const currentDebt = parseFloat(collateralInfo.borrowedMUSD || '0');
    const balance = parseFloat(musdBalance);

    // Check if user has enough MUSD to repay debt (excluding gas compensation)
    // Gas compensation is 200 MUSD, so we need debt - 200
    const requiredMUSD = Math.max(0, currentDebt - 200);

    if (balance < requiredMUSD) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least ${requiredMUSD.toFixed(2)} MUSD to close your trove. You have ${balance.toFixed(2)} MUSD.`
      );
      return;
    }

    // Check if approval is needed
    const debtBigInt = parseEther(collateralInfo.borrowedMUSD || '0');
    if (allowance < debtBigInt) {
      Alert.alert(
        'Approval Required',
        'Please approve MUSD spending first before closing your trove',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: handleApprove },
        ],
      );
      return;
    }

    // Confirm action
    Alert.alert(
      'Close Trove',
      `Are you sure you want to close your trove? This will:\n\n• Repay all debt (${currentDebt.toFixed(2)} MUSD)\n• Withdraw all collateral (${parseFloat(collateralInfo.btcCollateral || '0').toFixed(8)} BTC)\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Trove',
          style: 'destructive',
          onPress: async () => {
            setIsClosing(true);
            try {
              const result = await mezoClient.closeTrove();

              if (result.success) {
                // Wait a bit for blockchain state to update, then refresh
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                await refetch();
                await refreshBalances();
                
                Alert.alert('Success', 'Trove closed successfully', [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.back();
                    },
                  },
                ]);
              } else {
                const errorMessage = result.error || 'Failed to close trove';
                Alert.alert('Transaction Failed', errorMessage);
              }
            } catch (error) {
              console.error('Error closing trove:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to close trove';
              Alert.alert('Error', errorMessage);
            } finally {
              setIsClosing(false);
            }
          },
        },
      ],
    );
  };

  const currentDebt = parseFloat(collateralInfo?.borrowedMUSD || '0');
  const btcCollateral = parseFloat(collateralInfo?.btcCollateral || '0');
  const balance = parseFloat(musdBalance);
  const requiredMUSD = Math.max(0, currentDebt - 200); // Debt minus gas compensation
  const hasEnoughBalance = balance >= requiredMUSD;
  const needsApproval = allowance < parseEther(collateralInfo?.borrowedMUSD || '0');
  const canClose = hasEnoughBalance && !needsApproval && !isClosing;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Close Trove" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Warning Card */}
        <Card variant="elevated" style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color={DesignColors.error} />
            <Text style={styles.warningTitle}>Close Trove</Text>
          </View>
          <Text style={styles.warningText}>
            Closing your trove will repay all debt and withdraw all collateral. This action cannot be undone.
          </Text>
        </Card>

        {/* Collateral Health */}
        {collateralInfo && parseFloat(collateralInfo.btcCollateral) > 0 && (
          <CollateralHealth
            collateralRatio={collateralInfo.collateralRatio}
            healthStatus={collateralInfo.healthStatus}
            btcCollateral={collateralInfo.btcCollateral}
            borrowedMUSD={collateralInfo.borrowedMUSD}
            maxBorrowable={collateralInfo.maxBorrowable}
          />
        )}

        {/* Current Position */}
        {collateralInfo && (
          <Card variant="elevated" style={styles.currentPositionCard}>
            <Text style={styles.currentPositionTitle}>Current Position</Text>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>BTC Collateral:</Text>
              <Text style={styles.currentPositionValue}>
                {btcCollateral.toFixed(8)} BTC
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Total Debt:</Text>
              <Text style={styles.currentPositionValue}>
                {currentDebt.toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>MUSD Balance:</Text>
              <Text style={styles.currentPositionValue}>
                {balance.toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Required to Close:</Text>
              <Text style={[styles.currentPositionValue, { color: hasEnoughBalance ? DesignColors.success : DesignColors.error }]}>
                {requiredMUSD.toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Collateral Ratio:</Text>
              <Text style={styles.currentPositionValue}>
                {collateralInfo.collateralRatio.toFixed(2)}%
              </Text>
            </View>
          </Card>
        )}

        {/* Insufficient Balance Warning */}
        {!hasEnoughBalance && (
          <Card variant="elevated" style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="alert-circle" size={20} color={DesignColors.error} />
              <Text style={styles.errorTitle}>Insufficient Balance</Text>
            </View>
            <Text style={styles.errorText}>
              You need at least {requiredMUSD.toFixed(2)} MUSD to close your trove. You currently have {balance.toFixed(2)} MUSD.
            </Text>
          </Card>
        )}

        {/* Approval Status */}
        {needsApproval && (
          <Card variant="elevated" style={styles.approvalCard}>
            <View style={styles.approvalHeader}>
              <Ionicons name="warning" size={20} color={DesignColors.warning} />
              <Text style={styles.approvalTitle}>Approval Required</Text>
            </View>
            <Text style={styles.approvalText}>
              You need to approve MUSD spending before closing your trove.
            </Text>
            <Button
              title={isApproving ? 'Approving...' : 'Approve MUSD'}
              onPress={handleApprove}
              variant="outline"
              size="md"
              style={styles.approvalButton}
              disabled={isApproving}
              rightIcon={
                isApproving ? (
                  <ActivityIndicator size="small" color={DesignColors.yellow.primary} />
                ) : undefined
              }
            />
          </Card>
        )}

        {/* Close Button */}
        <Button
          title={isClosing ? 'Closing Trove...' : 'Close Trove'}
          onPress={handleCloseTrove}
          variant="primary"
          size="lg"
          style={StyleSheet.flatten([styles.closeButton, !canClose && styles.closeButtonDisabled])}
          disabled={!canClose}
          rightIcon={
            isClosing ? (
              <ActivityIndicator size="small" color={DesignColors.dark.primary} />
            ) : undefined
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.dark.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  warningCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.error + '40',
    backgroundColor: DesignColors.error + '10',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  warningTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    color: DesignColors.error,
  },
  warningText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.light.white,
    lineHeight: 20,
  },
  currentPositionCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.yellow.primary + '40',
  },
  currentPositionTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginBottom: Spacing.md,
  },
  currentPositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  currentPositionLabel: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
  },
  currentPositionValue: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  errorCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.error + '40',
    backgroundColor: DesignColors.error + '10',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    color: DesignColors.error,
  },
  errorText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.light.white,
    lineHeight: 20,
  },
  approvalCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.warning + '40',
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  approvalTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    color: DesignColors.warning,
  },
  approvalText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  approvalButton: {
    width: '100%',
  },
  closeButton: {
    marginTop: Spacing.md,
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
});

