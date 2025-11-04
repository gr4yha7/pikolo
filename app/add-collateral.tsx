/**
 * Add Collateral Screen - Add BTC collateral to existing trove
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
import { parseUnits } from 'viem';

export default function AddCollateralScreen() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { mezoClient, collateralInfo, isLoading: mezoLoading, refetch } = useMezo();

  const [btcAmount, setBtcAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [btcPrice, setBtcPrice] = useState(100000);
  const [calculatingHints, setCalculatingHints] = useState(false);

  // Fetch BTC price
  useEffect(() => {
    const fetchBTCPrice = async () => {
      if (mezoClient && wallet.evmAddress) {
        try {
          const price = await mezoClient.getBtcPrice();
          setBtcPrice(Number(price) / 1e18);
        } catch (error) {
          console.error('Error fetching BTC price:', error);
        }
      }
    };
    fetchBTCPrice();
  }, [mezoClient, wallet.evmAddress]);

  const handleAddCollateral = async () => {
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

    if (!btcAmount || parseFloat(btcAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid BTC amount');
      return;
    }

    setIsAdding(true);
    setCalculatingHints(true);

    try {
      const btcAmountBigInt = parseUnits(btcAmount, 18);
      
      // Calculate new collateral and debt after adding
      const currentCollateral = parseUnits(collateralInfo.btcCollateral || '0', 18);
      const currentDebt = parseUnits(collateralInfo.borrowedMUSD || '0', 18);
      const newCollateral = currentCollateral + btcAmountBigInt;
      
      // Calculate hints for the new position
      const hints = await calculateAdjustTroveHints(
        mezoClient.getConfig(),
        newCollateral,
        currentDebt,
        mezoClient.getPublicClient(),
      );

      setCalculatingHints(false);

      // Add collateral
      const result = await mezoClient.addCollateral({
        btcAmount: btcAmountBigInt,
        upperHint: hints.upperHint,
        lowerHint: hints.lowerHint,
      });

      if (result.success) {
        Alert.alert('Success', `Successfully added ${btcAmount} BTC collateral`, [
          {
            text: 'OK',
            onPress: () => {
              setBtcAmount('');
              refetch();
              router.back();
            },
          },
        ]);
      } else {
        const errorMessage = result.error || 'Failed to add collateral';
        Alert.alert('Transaction Failed', errorMessage);
      }
    } catch (error) {
      setCalculatingHints(false);
      console.error('Error adding collateral:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add collateral';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const canAdd = btcAmount && parseFloat(btcAmount) > 0 && !isAdding;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Add Collateral" />
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
            <Text style={styles.infoTitle}>Add BTC Collateral</Text>
          </View>
          <Text style={styles.infoText}>
            Add BTC collateral to your existing trove to improve your collateral ratio and reduce liquidation risk.
          </Text>
        </Card>

        {/* Current Position */}
        {collateralInfo && (
          <Card variant="elevated" style={styles.currentPositionCard}>
            <Text style={styles.currentPositionTitle}>Current Position</Text>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Collateral:</Text>
              <Text style={styles.currentPositionValue}>
                {parseFloat(collateralInfo.btcCollateral || '0').toFixed(4)} BTC
              </Text>
            </View>
            <View style={styles.currentPositionRow}>
              <Text style={styles.currentPositionLabel}>Debt:</Text>
              <Text style={styles.currentPositionValue}>
                {parseFloat(collateralInfo.borrowedMUSD || '0').toFixed(2)} MUSD
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

        {/* BTC Amount Input */}
        <Card variant="elevated" style={styles.inputCard}>
          <Text style={styles.inputLabel}>BTC Amount to Add</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={btcAmount}
              onChangeText={setBtcAmount}
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

        {/* New Position Preview */}
        {btcAmount && collateralInfo && parseFloat(btcAmount) > 0 && (
          <Card variant="elevated" style={styles.previewCard}>
            <Text style={styles.previewTitle}>After Adding Collateral</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>New Collateral:</Text>
              <Text style={styles.previewValue}>
                {(parseFloat(collateralInfo.btcCollateral || '0') + parseFloat(btcAmount)).toFixed(4)} BTC
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Estimated New Ratio:</Text>
              <Text style={styles.previewValue}>
                {(() => {
                  const currentCollateral = parseFloat(collateralInfo.btcCollateral || '0');
                  const currentDebt = parseFloat(collateralInfo.borrowedMUSD || '0');
                  const newCollateral = currentCollateral + parseFloat(btcAmount);
                  if (currentDebt === 0) return 'N/A';
                  const newRatio = ((newCollateral * btcPrice) / currentDebt) * 100;
                  return `${newRatio.toFixed(2)}%`;
                })()}
              </Text>
            </View>
          </Card>
        )}

        {/* Add Button */}
        <Button
          title={calculatingHints ? 'Calculating...' : isAdding ? 'Adding Collateral...' : 'Add Collateral'}
          onPress={handleAddCollateral}
          variant="primary"
          size="lg"
          style={styles.addButton}
          disabled={!canAdd || calculatingHints}
          rightIcon={
            isAdding || calculatingHints ? (
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
  addButton: {
    marginTop: Spacing.md,
  },
});

