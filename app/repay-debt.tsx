/**
 * Repay Debt Screen - Repay MUSD debt from existing trove
 */

import { AppHeader } from '@/components/app-header';
import { CollateralHealth } from '@/components/collateral-health';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mezoTestnetChain } from '@/constants/chain';
import { MUSD_ADDRESS } from '@/constants/swap';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMezo } from '@/hooks/useMezo';
import MUSDABI from '@/lib/contracts/abis/mezo/MUSD.json';
import { calculateAdjustTroveHints } from '@/utils/mezo-hints';
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
    TextInput,
    TouchableOpacity,
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

export default function RepayDebtScreen() {
  const router = useRouter();
  const { wallet, refreshBalances } = useWallet();
  const { mezoClient, collateralInfo, isLoading: mezoLoading, refetch } = useMezo();
  const { data: walletClient } = useWalletClient();
  const [musdAmount, setMusdAmount] = useState('');
  const [musdBalance, setMusdBalance] = useState('0');
  const [isRepaying, setIsRepaying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [calculatingHints, setCalculatingHints] = useState(false);
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

  const handleRepay = async () => {
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

    if (!musdAmount || parseFloat(musdAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid MUSD amount');
      return;
    }

    const musdAmountBigInt = parseEther(musdAmount);
    const balanceBigInt = parseEther(musdBalance);

    if (musdAmountBigInt > balanceBigInt) {
      Alert.alert('Insufficient Balance', `You have ${musdBalance} MUSD available`);
      return;
    }

    // Check if approval is needed
    if (allowance < musdAmountBigInt) {
      Alert.alert(
        'Approval Required',
        'Please approve MUSD spending first before repaying debt',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: handleApprove },
        ],
      );
      return;
    }

    setIsRepaying(true);
    setCalculatingHints(true);

    try {
      // Calculate new collateral and debt after repayment
      const currentCollateral = parseEther(collateralInfo.btcCollateral || '0');
      const currentDebt = parseEther(collateralInfo.borrowedMUSD || '0');
      const newDebt = currentDebt > musdAmountBigInt ? currentDebt - musdAmountBigInt : BigInt(0);

      // Calculate hints for the new position
      const hints = await calculateAdjustTroveHints(
        mezoClient.getConfig(),
        currentCollateral,
        newDebt,
        mezoClient.getPublicClient(),
      );

      setCalculatingHints(false);

      // Repay debt
      const result = await mezoClient.repay({
        musdAmount: musdAmountBigInt,
        upperHint: hints.upperHint,
        lowerHint: hints.lowerHint,
      });

      if (result.success) {
        Alert.alert('Success', `Successfully repaid ${musdAmount} MUSD`, [
          {
            text: 'OK',
            onPress: async () => {
              setMusdAmount('');
              await refreshBalances();
              refetch();
              router.back();
            },
          },
        ]);
      } else {
        const errorMessage = result.error || 'Failed to repay debt';
        Alert.alert('Transaction Failed', errorMessage);
      }
    } catch (error) {
      setCalculatingHints(false);
      console.error('Error repaying debt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to repay debt';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsRepaying(false);
    }
  };

  const currentDebt = parseFloat(collateralInfo?.borrowedMUSD || '0');
  const canRepay = musdAmount && parseFloat(musdAmount) > 0 && !isRepaying;
  const needsApproval = musdAmount && allowance < parseEther(musdAmount);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Repay Debt" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
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

        {/* Info Card */}
        <Card variant="elevated" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={DesignColors.yellow.primary} />
            <Text style={styles.infoTitle}>Repay MUSD Debt</Text>
          </View>
          <Text style={styles.infoText}>
            Repay MUSD debt to reduce your loan amount and improve your collateral ratio. You can repay any amount up to your total debt.
          </Text>
        </Card>

        {/* Current Position */}
        {collateralInfo && (
          <Card variant="elevated" style={styles.currentPositionCard}>
            <Text style={styles.currentPositionTitle}>Current Position</Text>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Total Debt:</Text>
              <Text style={styles.currentPositionValue}>
                {currentDebt.toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>MUSD Balance:</Text>
              <Text style={styles.currentPositionValue}>
                {musdBalance} MUSD
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

        {/* MUSD Amount Input */}
        <Card variant="elevated" style={styles.inputCard}>
          <Text style={styles.inputLabel}>MUSD Amount to Repay</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={musdAmount}
              onChangeText={setMusdAmount}
              placeholder="0.00"
              placeholderTextColor={DesignColors.dark.muted}
              keyboardType="decimal-pad"
            />
            <View style={styles.inputSuffix}>
              <Ionicons name="diamond" size={16} color={DesignColors.yellow.primary} />
              <Text style={styles.suffixText}>MUSD</Text>
            </View>
          </View>
          <View style={styles.quickAmountButtons}>
            <TouchableOpacity
              style={styles.quickAmountButton}
              onPress={() => setMusdAmount(musdBalance)}>
              <Text style={styles.quickAmountText}>Max ({musdBalance})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAmountButton}
              onPress={() => setMusdAmount(currentDebt.toFixed(2))}>
              <Text style={styles.quickAmountText}>All Debt ({currentDebt.toFixed(2)})</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Approval Status */}
        {needsApproval && (
          <Card variant="elevated" style={styles.approvalCard}>
            <View style={styles.approvalHeader}>
              <Ionicons name="warning" size={20} color={DesignColors.warning} />
              <Text style={styles.approvalTitle}>Approval Required</Text>
            </View>
            <Text style={styles.approvalText}>
              You need to approve MUSD spending before repaying debt.
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

        {/* New Position Preview */}
        {musdAmount && collateralInfo && parseFloat(musdAmount) > 0 && (
          <Card variant="elevated" style={styles.previewCard}>
            <Text style={styles.previewTitle}>After Repayment</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Remaining Debt:</Text>
              <Text style={styles.previewValue}>
                {Math.max(0, currentDebt - parseFloat(musdAmount)).toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Estimated New Ratio:</Text>
              <Text style={styles.previewValue}>
                {(() => {
                  const currentCollateral = parseFloat(collateralInfo.btcCollateral || '0');
                  const remainingDebt = Math.max(0, currentDebt - parseFloat(musdAmount));
                  if (remainingDebt === 0) return 'N/A (Debt Paid Off)';
                  // Estimate BTC price (simplified - could fetch actual price)
                  const estimatedBtcPrice = 100000;
                  const newRatio = ((currentCollateral * estimatedBtcPrice) / remainingDebt) * 100;
                  return `${newRatio.toFixed(2)}%`;
                })()}
              </Text>
            </View>
          </Card>
        )}

        {/* Repay Button */}
        <Button
          title={calculatingHints ? 'Calculating...' : isRepaying ? 'Repaying Debt...' : 'Repay Debt'}
          onPress={handleRepay}
          variant="primary"
          size="lg"
          style={styles.repayButton}
          disabled={!canRepay || calculatingHints || needsApproval}
          rightIcon={
            isRepaying || calculatingHints ? (
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
  infoCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
  },
  infoText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
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
  inputCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.dark.muted,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    padding: Spacing.md,
  },
  inputSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: Spacing.md,
  },
  suffixText: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.yellow.primary,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DesignColors.dark.muted,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.yellow.primary,
    fontWeight: '500',
  },
  approvalCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.warning + '40',
    backgroundColor: DesignColors.warning + '10',
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  approvalTitle: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.warning,
  },
  approvalText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
    marginBottom: Spacing.md,
  },
  approvalButton: {
    width: '100%',
  },
  previewCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: DesignColors.dark.secondary,
  },
  previewTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginBottom: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  previewLabel: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
  },
  previewValue: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.yellow.primary,
  },
  repayButton: {
    marginTop: Spacing.md,
  },
});

