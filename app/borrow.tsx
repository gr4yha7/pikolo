/**
 * Borrow Screen - MUSD borrowing against BTC collateral via Mezo
 */

import { AppHeader } from '@/components/app-header';
import { CollateralHealth } from '@/components/collateral-health';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useMezo } from '@/hooks/useMezo';
import { calculateOpenTroveHints, calculateAdjustTroveHints, getExpectedTotalDebt } from '@/utils/mezo-hints';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatEther, parseEther, parseUnits } from 'viem';

export default function BorrowScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { wallet } = useWallet();
  const { mezoClient, collateralInfo, isLoading: mezoLoading, refetch } = useMezo();
  const borrowState = useAppSelector((state: any) => state.borrow);

  const [btcAmount, setBtcAmount] = useState('');
  const [ltv, setLtv] = useState(0); // 0-90.91% LTV (based on 110% MCR)
  const [musdAmount, setMusdAmount] = useState('');
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [btcPrice, setBtcPrice] = useState(100000); // Default BTC price
  const [calculatingHints, setCalculatingHints] = useState(false);

  const maxLTV = 90.91; // ~90.91% max LTV (based on 110% MCR: 1/1.1 = 0.9091)

  // Fetch BTC price and update calculations
  useEffect(() => {
    const fetchBTCPrice = async () => {
      if (mezoClient && wallet.evmAddress) {
        try {
          const price = await mezoClient.getBtcPrice();
          // BTC price on Mezo is in wei (18 decimals), convert to USD
          setBtcPrice(Number(price) / 1e18);
        } catch (error) {
          console.error('Error fetching BTC price:', error);
        }
      }
    };
    fetchBTCPrice();
  }, [mezoClient, wallet.evmAddress]);

  // Check if user has existing trove
  const hasExistingTrove = collateralInfo && parseFloat(collateralInfo.btcCollateral) > 0;
  const currentDebt = hasExistingTrove ? parseFloat(collateralInfo.borrowedMUSD || '0') : 0;
  const maxBorrowable = hasExistingTrove ? parseFloat(collateralInfo.maxBorrowable || '0') : 0;
  const availableToBorrow = Math.max(0, maxBorrowable - currentDebt);

  // Calculate MUSD amount based on BTC amount and LTV (only for new troves)
  useEffect(() => {
    if (!hasExistingTrove && btcAmount && ltv > 0) {
      const btcValue = parseFloat(btcAmount) * btcPrice;
      const calculatedMUSD = (btcValue * ltv) / 100;
      setMusdAmount(calculatedMUSD.toFixed(2));
    } else if (!hasExistingTrove && !btcAmount) {
      setMusdAmount('');
    }
  }, [btcAmount, ltv, btcPrice, hasExistingTrove]);

  // Calculate BTC amount based on MUSD and LTV (only for new troves)
  useEffect(() => {
    if (!hasExistingTrove && musdAmount && ltv > 0) {
      const calculatedBTC = parseFloat(musdAmount) / (btcPrice * (ltv / 100));
      setBtcAmount(calculatedBTC.toFixed(8));
    }
  }, [musdAmount, ltv, btcPrice, hasExistingTrove]);

  const handleLTVChange = (value: number) => {
    if (hasExistingTrove) return; // LTV only applies to new troves
    setLtv(value);
    // Recalculate MUSD based on BTC
    if (btcAmount) {
      const btcValue = parseFloat(btcAmount) * btcPrice;
      const calculatedMUSD = (btcValue * value) / 100;
      setMusdAmount(calculatedMUSD.toFixed(2));
    }
  };

  const handleBTCAmountChange = (text: string) => {
    if (hasExistingTrove) return; // BTC input only for new troves
    setBtcAmount(text);
    if (ltv > 0) {
      const numValue = parseFloat(text);
      if (!isNaN(numValue)) {
        const btcValue = numValue * btcPrice;
        const calculatedMUSD = (btcValue * ltv) / 100;
        setMusdAmount(calculatedMUSD.toFixed(2));
      }
    }
  };

  const handleMUSDAmountChange = (text: string) => {
    setMusdAmount(text);
    // Only auto-calculate BTC for new troves
    if (!hasExistingTrove && ltv > 0) {
      const numValue = parseFloat(text);
      if (!isNaN(numValue)) {
        const calculatedBTC = numValue / (btcPrice * (ltv / 100));
        setBtcAmount(calculatedBTC.toFixed(8));
      }
    }
  };

  const handleBorrow = async () => {
    if (!wallet.isConnected || !wallet.evmAddress) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet first');
      return;
    }

    if (!mezoClient) {
      Alert.alert('Error', 'Mezo client not initialized');
      return;
    }

    if (!musdAmount || parseFloat(musdAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter MUSD amount to borrow');
      return;
    }

    // For new troves, require BTC collateral
    if (!hasExistingTrove && (!btcAmount || parseFloat(btcAmount) <= 0)) {
      Alert.alert('Invalid Amount', 'Please enter BTC collateral amount');
      return;
    }

    // For existing troves, check if borrowing more exceeds max
    if (hasExistingTrove) {
      // Get expected total debt including fees (for validation)
      const musdAmountBigInt = parseEther(musdAmount);
      const expectedTotalDebt = await getExpectedTotalDebt(
        mezoClient.getConfig(),
        musdAmountBigInt,
        mezoClient.getPublicClient(),
      );
      const newTotalDebt = currentDebt + Number(formatEther(expectedTotalDebt));
      
      if (newTotalDebt > maxBorrowable) {
        Alert.alert('Exceeds Maximum', `You can only borrow up to ${availableToBorrow.toFixed(2)} MUSD more (including fees). Maximum total debt: ${maxBorrowable.toFixed(2)} MUSD`);
        return;
      }
    }

    setIsBorrowing(true);
    setCalculatingHints(true);

    try {
      const musdAmountBigInt = parseEther(musdAmount);

      if (hasExistingTrove) {
        // Borrow more from existing trove (no additional collateral needed)
        const currentCollateral = parseEther(collateralInfo.btcCollateral || '0');
        const newTotalDebt = parseEther((currentDebt + parseFloat(musdAmount)).toFixed(2));

        // Calculate hints for adjusting trove
        const hints = await calculateAdjustTroveHints(
          mezoClient.getConfig(),
          currentCollateral,
          newTotalDebt,
          mezoClient.getPublicClient(),
        );

        setCalculatingHints(false);

        // Call withdrawMUSD to borrow more
        const result = await mezoClient.withdrawMUSD({
          musdAmount: musdAmountBigInt,
          upperHint: hints.upperHint,
          lowerHint: hints.lowerHint,
        });

        if (result.success) {
          Alert.alert('Success', `Successfully borrowed ${musdAmount} MUSD more`, [
            {
              text: 'OK',
              onPress: async () => {
                setMusdAmount('');
                await refetch();
                router.back();
              },
            },
          ]);
        } else {
          const errorMessage = result.error || 'Failed to borrow more MUSD';
          Alert.alert('Transaction Failed', errorMessage);
        }
      } else {
        // Open new trove (requires BTC collateral)
        const btcAmountBigInt = parseUnits(btcAmount, 18);

        // Get expected total debt (includes gas compensation and borrowing fee)
        const expectedTotalDebt = await getExpectedTotalDebt(
          mezoClient.getConfig(),
          musdAmountBigInt,
          mezoClient.getPublicClient(),
        );

        // Calculate hints for the transaction
        const hints = await calculateOpenTroveHints(
          mezoClient.getConfig(),
          btcAmountBigInt,
          expectedTotalDebt,
          mezoClient.getPublicClient(),
        );

        setCalculatingHints(false);

        // Call openTrove with hints
        const result = await mezoClient.openTrove({
          btcAmount: btcAmountBigInt,
          musdAmount: musdAmountBigInt,
          upperHint: hints.upperHint,
          lowerHint: hints.lowerHint,
        });

        if (result.success) {
          Alert.alert('Success', `Successfully borrowed ${musdAmount} MUSD`, [
            {
              text: 'OK',
              onPress: async () => {
                setBtcAmount('');
                setMusdAmount('');
                setLtv(0);
                await refetch();
                router.back();
              },
            },
          ]);
        } else {
          const errorMessage = result.error || 'Failed to borrow MUSD';
          Alert.alert('Transaction Failed', errorMessage);
        }
      }
    } catch (error) {
      setCalculatingHints(false);
      console.error('Error borrowing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to borrow MUSD';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsBorrowing(false);
    }
  };

  const canBorrow = hasExistingTrove
    ? musdAmount && parseFloat(musdAmount) > 0 && (currentDebt + parseFloat(musdAmount)) <= maxBorrowable && !isBorrowing
    : btcAmount && musdAmount && ltv > 0 && ltv <= maxLTV && !isBorrowing;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Borrow" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Collateral Health (if user has existing position) */}
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
            <Text style={styles.infoTitle}>Borrow MUSD</Text>
          </View>
          <Text style={styles.infoText}>
            {hasExistingTrove 
              ? `Borrow more MUSD from your existing trove. You can borrow up to ${availableToBorrow.toFixed(2)} MUSD more without adding collateral.`
              : 'Deposit BTC collateral to borrow MUSD. Maximum LTV is ~90.91% (110% MCR). Interest rate is governable.'}
          </Text>
          <View style={styles.rateBadge}>
            <Text style={styles.rateText}>Gas Compensation: 200 MUSD</Text>
          </View>
        </Card>

        {/* BTC Amount Input - Only show for new troves */}
        {!hasExistingTrove && (
          <Card variant="elevated" style={styles.inputCard}>
            <Text style={styles.inputLabel}>BTC Collateral</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={btcAmount}
              onChangeText={handleBTCAmountChange}
              placeholder="0.00000000"
              placeholderTextColor={DesignColors.dark.muted}
              keyboardType="decimal-pad"
            />
            <View style={styles.inputSuffix}>
              <Text style={styles.suffixText}>BTC</Text>
            </View>
          </View>
          <Text style={styles.inputSubtext}>
            ≈ ${btcAmount ? (parseFloat(btcAmount) * btcPrice).toFixed(2) : '0.00'} USD
          </Text>
        </Card>
        )}

        {/* LTV Slider - Only show for new troves */}
        {!hasExistingTrove && (
          <Card variant="elevated" style={styles.sliderCard}>
          <View style={styles.sliderHeader}>
            <Text style={styles.inputLabel}>Loan-to-Value (LTV)</Text>
            <Text style={styles.ltvValue}>{ltv.toFixed(1)}%</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              minimumValue={0}
              maximumValue={maxLTV}
              value={ltv}
              onValueChange={handleLTVChange}
              minimumTrackTintColor={DesignColors.yellow.primary}
              maximumTrackTintColor={DesignColors.dark.muted}
              thumbTintColor={DesignColors.yellow.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0%</Text>
              <Text style={styles.sliderLabel}>45%</Text>
              <Text style={styles.sliderLabel}>90.91%</Text>
            </View>
          </View>
          <Text style={styles.inputSubtext}>Maximum LTV: {maxLTV.toFixed(2)}%</Text>
        </Card>
        )}

        {/* MUSD Amount Input */}
        <Card variant="elevated" style={styles.inputCard}>
          <Text style={styles.inputLabel}>MUSD to Borrow</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={musdAmount}
              onChangeText={handleMUSDAmountChange}
              placeholder="0.00"
              placeholderTextColor={DesignColors.dark.muted}
              keyboardType="decimal-pad"
            />
            <View style={styles.inputSuffix}>
              <Ionicons name="diamond" size={16} color={DesignColors.yellow.primary} />
              <Text style={styles.suffixText}>MUSD</Text>
            </View>
          </View>
          {hasExistingTrove ? (
            <Text style={styles.inputSubtext}>
              Available to borrow: {availableToBorrow.toFixed(2)} MUSD (max: {maxBorrowable.toFixed(2)} MUSD total)
            </Text>
          ) : (
            <Text style={styles.inputSubtext}>
              Note: Borrowing fee and gas compensation (200 MUSD) will be added to your debt
            </Text>
          )}
        </Card>

        {/* Summary Card */}
        {((!hasExistingTrove && btcAmount && musdAmount) || (hasExistingTrove && musdAmount)) && (
          <Card variant="elevated" style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Borrow Summary</Text>
            {!hasExistingTrove && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>BTC Collateral:</Text>
                  <Text style={styles.summaryValue}>{btcAmount} BTC</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>LTV:</Text>
                  <Text style={styles.summaryValue}>{ltv.toFixed(1)}%</Text>
                </View>
              </>
            )}
            {hasExistingTrove && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current Debt:</Text>
                <Text style={styles.summaryValue}>{currentDebt.toFixed(2)} MUSD</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>MUSD to Borrow:</Text>
              <Text style={styles.summaryValue}>{musdAmount} MUSD</Text>
            </View>
            {hasExistingTrove && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>New Total Debt:</Text>
                <Text style={styles.summaryValue}>{(currentDebt + parseFloat(musdAmount)).toFixed(2)} MUSD</Text>
              </View>
            )}
            {!hasExistingTrove && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gas Compensation:</Text>
                <Text style={styles.summaryValue}>200 MUSD</Text>
              </View>
            )}
          </Card>
        )}

        {/* Borrow Button */}
        <Button
          title={
            calculatingHints
              ? 'Calculating...'
              : isBorrowing
                ? (hasExistingTrove ? 'Borrowing More...' : 'Opening Trove...')
                : (hasExistingTrove ? 'Borrow More MUSD' : 'Open Trove & Borrow MUSD')
          }
          onPress={handleBorrow}
          variant="primary"
          size="lg"
          style={styles.borrowButton}
          disabled={!canBorrow || calculatingHints}
          rightIcon={
            isBorrowing || calculatingHints ? (
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
    marginBottom: Spacing.sm,
  },
  rateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: DesignColors.yellow.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  rateText: {
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
    color: DesignColors.yellow.primary,
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
  inputSubtext: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
    marginTop: Spacing.xs,
  },
  sliderCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ltvValue: {
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.yellow.primary,
  },
  sliderContainer: {
    marginBottom: Spacing.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sliderLabel: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
  },
  summaryCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: DesignColors.yellow.primary + '40',
  },
  summaryTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
  },
  summaryValue: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  borrowButton: {
    marginTop: Spacing.md,
  },
});

