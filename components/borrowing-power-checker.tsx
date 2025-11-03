/**
 * Borrowing Power Checker Component
 * 
 * Interactive calculator for checking borrowing power against BTC collateral
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMezo } from '@/hooks/useMezo';
import {
    calculateBorrowAmount,
    calculateBorrowingFees,
    calculateLiquidationPrice,
    getMinimumCollateralizationRatio,
    getRecommendedCollateralizationRatio
} from '@/utils/borrowing-power';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Slider } from './ui/slider';

interface BorrowingPowerCheckerProps {
  onGetStarted?: () => void;
  defaultBtcAmount?: number;
  defaultCollateralizationRatio?: number;
}

export function BorrowingPowerChecker({
  onGetStarted,
  defaultBtcAmount,
  defaultCollateralizationRatio,
}: BorrowingPowerCheckerProps) {
  const { wallet } = useWallet();
  const { mezoClient } = useMezo();
  
  const [btcAmount, setBtcAmount] = useState(defaultBtcAmount || 0.01);
  const [collateralizationRatio, setCollateralizationRatio] = useState(
    defaultCollateralizationRatio || getRecommendedCollateralizationRatio(),
  );
  const [btcPrice, setBtcPrice] = useState(60000); // Default BTC price
  const [borrowingFeeRate, setBorrowingFeeRate] = useState(10); // Default 0.1% (10 basis points)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [showLiquidationInfo, setShowLiquidationInfo] = useState(false);
  const [showFeesInfo, setShowFeesInfo] = useState(false);

  const minCollateralizationRatio = getMinimumCollateralizationRatio();
  const maxCollateralizationRatio = 300; // Maximum reasonable ratio

  // Fetch BTC price and borrowing fee rate
  useEffect(() => {
    const fetchData = async () => {
      if (mezoClient) {
        setIsLoadingPrice(true);
        try {
          const price = await mezoClient.getBtcPrice();
          // BTC price on Mezo is in wei (18 decimals), convert to USD
          setBtcPrice(Number(price) / 1e18);
          
          // Note: Borrowing fee rate is typically around 0.1% (10 basis points)
          // This is fetched dynamically based on debt amount via getBorrowingFee()
          // For the checker, we use a reasonable default
          setBorrowingFeeRate(10); // 0.1% default
        } catch (error) {
          console.error('Error fetching BTC price:', error);
          // Keep default price on error
        } finally {
          setIsLoadingPrice(false);
        }
      }
    };
    fetchData();
  }, [mezoClient]);

  // Calculate values based on inputs
  const calculations = useMemo(() => {
    const borrowAmount = calculateBorrowAmount(btcAmount, btcPrice, collateralizationRatio);
    const liquidationPrice = calculateLiquidationPrice(
      btcPrice,
      borrowAmount,
      btcAmount,
      minCollateralizationRatio,
    );
    const fees = calculateBorrowingFees(borrowAmount, borrowingFeeRate);

    return {
      borrowAmount,
      liquidationPrice,
      fees,
    };
  }, [btcAmount, btcPrice, collateralizationRatio, minCollateralizationRatio]);

  // Get available BTC balance (for max slider value)
  const availableBTC = parseFloat(wallet.btcBalance || wallet.evmBalance || '0');

  // Max BTC amount (use available balance or default to 10 BTC)
  const maxBtcAmount = Math.max(availableBTC, 10);

  const handleBtcAmountChange = (value: number) => {
    setBtcAmount(value);
  };

  const handleCollateralizationChange = (value: number) => {
    setCollateralizationRatio(value);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Check your <Text style={styles.highlight}>borrowing</Text> power
        </Text>
      </View>

      {/* Bitcoin to borrow against */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Bitcoin to borrow against</Text>
        <Text style={styles.sectionValue}>{btcAmount.toFixed(8)} BTC</Text>
        <View style={styles.slider}>
          <Slider
            value={btcAmount}
            minimumValue={0}
            maximumValue={maxBtcAmount}
            onValueChange={handleBtcAmountChange}
            minimumTrackTintColor={DesignColors.yellow.primary}
            maximumTrackTintColor={DesignColors.dark.secondary}
            thumbTintColor={DesignColors.yellow.primary}
          />
        </View>
      </View>

      {/* Collateralization */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Collateralization</Text>
        <Text style={styles.sectionValue}>{collateralizationRatio.toFixed(0)}%</Text>
        <View style={styles.slider}>
          <Slider
            value={collateralizationRatio}
            minimumValue={minCollateralizationRatio}
            maximumValue={maxCollateralizationRatio}
            onValueChange={handleCollateralizationChange}
            minimumTrackTintColor={DesignColors.yellow.primary}
            maximumTrackTintColor={DesignColors.dark.secondary}
            thumbTintColor={DesignColors.yellow.primary}
          />
        </View>
        {collateralizationRatio < 150 && (
          <View style={styles.warningBadge}>
            <Ionicons name="warning" size={14} color={DesignColors.error} />
            <Text style={styles.warningText}>Low collateralization - High liquidation risk</Text>
          </View>
        )}
      </View>

      {/* Borrow amount */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Borrow amount</Text>
        <Text style={styles.sectionValue}>
          {calculations.borrowAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          <Text style={styles.currencyLabel}> MUSD</Text>
        </Text>
      </View>

      {/* Liquidation Risk Card */}
      <Card variant="elevated" style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Liquidation risk</Text>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardRowLeft}>
            <Text style={styles.cardLabel}>BTC liquidation price</Text>
            <TouchableOpacity
              onPress={() => setShowLiquidationInfo(true)}
              style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={16} color={DesignColors.dark.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardValue}>
            ${calculations.liquidationPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </Card>

      {/* Fees Card */}
      <Card variant="elevated" style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Fees</Text>
        </View>
        <View style={styles.feesTotal}>
          <Text style={styles.cardLabel}>Total Fees</Text>
          <Text style={styles.cardValue}>
            ${calculations.fees.totalFees.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardRowLeft}>
            <Text style={styles.cardLabel}>Liquidation fee deposit</Text>
            <TouchableOpacity
              onPress={() => setShowFeesInfo(true)}
              style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={16} color={DesignColors.dark.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardValue}>
            ${calculations.fees.liquidationFeeDeposit.toFixed(2)}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardRowLeft}>
            <Text style={styles.cardLabel}>Issuance fee</Text>
          </View>
          <Text style={styles.cardValue}>
            ${calculations.fees.issuanceFee.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </Card>

      {/* Get Started Button */}
      {onGetStarted && (
        <Button
          title="Get started"
          onPress={onGetStarted}
          variant="primary"
          size="lg"
          style={styles.getStartedButton}
        />
      )}

      {/* Info Modals */}
      <Modal
        visible={showLiquidationInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLiquidationInfo(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLiquidationInfo(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Liquidation Price</Text>
            <Text style={styles.modalText}>
              The liquidation price is the BTC price at which your collateral would be liquidated.
              If BTC drops to this price or below, your position will be liquidated and you may
              lose your collateral.
            </Text>
            <Button
              title="Got it"
              onPress={() => setShowLiquidationInfo(false)}
              variant="primary"
              size="md"
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showFeesInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeesInfo(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFeesInfo(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Liquidation Fee Deposit</Text>
            <Text style={styles.modalText}>
              A fixed 200 MUSD deposit is held as gas compensation for liquidators. This amount is
              added to your debt but is returned when you repay your loan or close your trove.
            </Text>
            <Button
              title="Got it"
              onPress={() => setShowFeesInfo(false)}
              variant="primary"
              size="md"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.heading.lg.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    textAlign: 'center',
  },
  highlight: {
    color: DesignColors.yellow.primary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: Typography.body.md.fontSize,
    color: DesignColors.dark.muted,
    marginBottom: Spacing.xs,
  },
  sectionValue: {
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginBottom: Spacing.md,
  },
  currencyLabel: {
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'normal',
    color: DesignColors.dark.muted,
  },
  slider: {
    marginTop: Spacing.sm,
    width: '100%',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: DesignColors.error + '20',
    borderRadius: Radius.sm,
  },
  warningText: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.error,
  },
  infoCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  feesTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.dark.muted,
  },
  cardLabel: {
    fontSize: Typography.body.sm.fontSize,
    color: DesignColors.dark.muted,
  },
  cardValue: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    color: DesignColors.light.white,
  },
  infoIconContainer: {
    padding: 2,
  },
  getStartedButton: {
    marginTop: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    color: DesignColors.light.white,
    marginBottom: Spacing.md,
  },
  modalText: {
    fontSize: Typography.body.md.fontSize,
    color: DesignColors.dark.muted,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
});

