/**
 * Withdraw MUSD Screen - Withdraw additional MUSD from existing trove
 */

import { AppHeader } from '@/components/app-header';
import { CollateralHealth } from '@/components/collateral-health';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMezo } from '@/hooks/useMezo';
import { calculateAdjustTroveHints } from '@/utils/mezo-hints';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { formatEther, parseEther } from 'viem';

export default function WithdrawMUSDScreen() {
  const router = useRouter();
  const { wallet, refreshBalances } = useWallet();
  const { mezoClient, collateralInfo, isLoading: mezoLoading, refetch } = useMezo();
  const [musdAmount, setMusdAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [calculatingHints, setCalculatingHints] = useState(false);

  const handleWithdraw = async () => {
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
    const maxBorrowable = parseEther(collateralInfo.maxBorrowable || '0');
    const currentDebt = parseEther(collateralInfo.borrowedMUSD || '0');
    const availableToBorrow = maxBorrowable - currentDebt;

    if (musdAmountBigInt > availableToBorrow) {
      Alert.alert(
        'Exceeds Max Borrowable',
        `You can only withdraw up to ${formatEther(availableToBorrow)} MUSD. Your max borrowable is ${collateralInfo.maxBorrowable} MUSD.`
      );
      return;
    }

    setIsWithdrawing(true);
    setCalculatingHints(true);

    try {
      // Calculate new collateral and debt after withdrawal
      const currentCollateral = parseEther(collateralInfo.btcCollateral || '0');
      const newDebt = currentDebt + musdAmountBigInt;

      // Calculate hints for the new position
      const hints = await calculateAdjustTroveHints(
        mezoClient.getConfig(),
        currentCollateral,
        newDebt,
        mezoClient.getPublicClient(),
      );

      setCalculatingHints(false);

      // Withdraw MUSD
      const result = await mezoClient.withdrawMUSD({
        musdAmount: musdAmountBigInt,
        upperHint: hints.upperHint,
        lowerHint: hints.lowerHint,
      });

      if (result.success) {
        // Wait a bit for blockchain state to update, then refresh
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await refetch();
        await refreshBalances();
        
        Alert.alert('Success', `Successfully withdrew ${musdAmount} MUSD`, [
          {
            text: 'OK',
            onPress: () => {
              setMusdAmount('');
              router.back();
            },
          },
        ]);
      } else {
        const errorMessage = result.error || 'Failed to withdraw MUSD';
        Alert.alert('Transaction Failed', errorMessage);
      }
    } catch (error) {
      setCalculatingHints(false);
      console.error('Error withdrawing MUSD:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw MUSD';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const currentDebt = parseFloat(collateralInfo?.borrowedMUSD || '0');
  const maxBorrowable = parseFloat(collateralInfo?.maxBorrowable || '0');
  const availableToBorrow = Math.max(0, maxBorrowable - currentDebt);
  const canWithdraw = musdAmount && parseFloat(musdAmount) > 0 && parseFloat(musdAmount) <= availableToBorrow && !isWithdrawing;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Withdraw MUSD" />
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
            <Text style={styles.infoTitle}>Withdraw MUSD</Text>
          </View>
          <Text style={styles.infoText}>
            Withdraw additional MUSD from your trove. This will increase your debt and lower your collateral ratio. Make sure you stay above the minimum collateralization ratio.
          </Text>
        </Card>

        {/* Current Position */}
        {collateralInfo && (
          <Card variant="elevated" style={styles.currentPositionCard}>
            <Text style={styles.currentPositionTitle}>Current Position</Text>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Current Debt:</Text>
              <Text style={styles.currentPositionValue}>
                {currentDebt.toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Max Borrowable:</Text>
              <Text style={styles.currentPositionValue}>
                {maxBorrowable.toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Available to Withdraw:</Text>
              <Text style={[styles.currentPositionValue, { color: DesignColors.yellow.primary }]}>
                {availableToBorrow.toFixed(2)} MUSD
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
          <Text style={styles.inputLabel}>MUSD Amount to Withdraw</Text>
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
              onPress={() => setMusdAmount(availableToBorrow.toFixed(2))}>
              <Text style={styles.quickAmountText}>Max ({availableToBorrow.toFixed(2)})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAmountButton}
              onPress={() => setMusdAmount((availableToBorrow * 0.5).toFixed(2))}>
              <Text style={styles.quickAmountText}>50%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAmountButton}
              onPress={() => setMusdAmount((availableToBorrow * 0.25).toFixed(2))}>
              <Text style={styles.quickAmountText}>25%</Text>
            </TouchableOpacity>
          </View>
          {musdAmount && parseFloat(musdAmount) > availableToBorrow && (
            <Text style={styles.errorText}>
              Amount exceeds available to withdraw ({availableToBorrow.toFixed(2)} MUSD)
            </Text>
          )}
        </Card>

        {/* New Position Preview */}
        {musdAmount && collateralInfo && parseFloat(musdAmount) > 0 && parseFloat(musdAmount) <= availableToBorrow && (
          <Card variant="elevated" style={styles.previewCard}>
            <Text style={styles.previewTitle}>After Withdrawal</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>New Debt:</Text>
              <Text style={styles.previewValue}>
                {(currentDebt + parseFloat(musdAmount)).toFixed(2)} MUSD
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Estimated New Ratio:</Text>
              <Text style={styles.previewValue}>
                {(() => {
                  const currentCollateral = parseFloat(collateralInfo.btcCollateral || '0');
                  const newDebt = currentDebt + parseFloat(musdAmount);
                  // Estimate BTC price (simplified - could fetch actual price)
                  const estimatedBtcPrice = 100000;
                  const newRatio = ((currentCollateral * estimatedBtcPrice) / newDebt) * 100;
                  return `${newRatio.toFixed(2)}%`;
                })()}
              </Text>
            </View>
          </Card>
        )}

        {/* Withdraw Button */}
        <Button
          title={calculatingHints ? 'Calculating...' : isWithdrawing ? 'Withdrawing MUSD...' : 'Withdraw MUSD'}
          onPress={handleWithdraw}
          variant="primary"
          size="lg"
          style={styles.withdrawButton}
          disabled={!canWithdraw || calculatingHints}
          rightIcon={
            isWithdrawing || calculatingHints ? (
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
    gap: Spacing.xs,
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
    padding: Spacing.sm,
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: DesignColors.dark.muted,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.yellow.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.error,
    marginTop: Spacing.xs,
  },
  previewCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.yellow.primary + '40',
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
    color: DesignColors.light.white,
  },
  withdrawButton: {
    marginTop: Spacing.md,
  },
});

