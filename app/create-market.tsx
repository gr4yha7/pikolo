import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMarketFactory } from '@/hooks/useMarketFactory';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseEther } from 'viem';

export default function CreateMarketScreen() {
  const router = useRouter();
  const { wallet } = useWallet();
  
  // Get factory address from environment
  const factoryAddress = (process.env.EXPO_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS || '') as `0x${string}` | null;
  
  const {
    createMarket,
    isLoading: factoryLoading,
    error: factoryError,
  } = useMarketFactory(factoryAddress);

  const [threshold, setThreshold] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const [initialLiquidity, setInitialLiquidity] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Calculate expiration timestamp
  const expirationTimestamp = Math.floor(Date.now() / 1000) + (parseInt(expirationDays || '7') * 24 * 60 * 60);

  // Get MUSD balance
  const musdBalance = wallet.musdBalance ? parseFloat(wallet.musdBalance) : 0;

  // Auto-generate market question
  const question = threshold
    ? `Will Bitcoin price be above $${parseFloat(threshold).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} by ${new Date(expirationTimestamp * 1000).toLocaleDateString()}?`
    : 'Enter threshold to see question';

  const handleCreate = async () => {
    if (!factoryAddress) {
      Alert.alert('Error', 'Prediction Market Factory address not configured');
      return;
    }

    if (!threshold || parseFloat(threshold) <= 0) {
      Alert.alert('Error', 'Please enter a valid BTC price threshold');
      return;
    }

    if (!expirationDays || parseInt(expirationDays) <= 0) {
      Alert.alert('Error', 'Please enter valid expiration days');
      return;
    }

    if (!initialLiquidity || parseFloat(initialLiquidity) <= 0) {
      Alert.alert('Error', 'Please enter initial liquidity amount');
      return;
    }

    const liquidityAmount = parseEther(initialLiquidity);
    const liquidityNum = parseFloat(initialLiquidity);

    if (liquidityNum > musdBalance) {
      Alert.alert('Error', 'Insufficient MUSD balance');
      return;
    }

    try {
      setIsCreating(true);

      const result = await createMarket({
        threshold: parseFloat(threshold), // Price in USD (will be scaled by contract)
        expirationTime: expirationTimestamp, // Unix timestamp (number)
        initialLiquidity: liquidityAmount,
      });

      Alert.alert(
        'Success',
        `Market created successfully! Address: ${result.marketAddress.slice(0, 10)}...`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create market';
      Alert.alert('Error', errorMessage);
      console.error('Create market error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Create Market" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Info Card */}
        <Card variant="elevated" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color={DesignColors.yellow.primary} />
            <Text style={styles.infoText}>
              Create a BTC price prediction market. Initial liquidity will be split 50/50 between Yes/No pools.
            </Text>
          </View>
        </Card>

        {/* Market Question Preview */}
        <Card variant="elevated" style={styles.questionCard}>
          <Text style={styles.questionLabel}>Market Question</Text>
          <View style={styles.questionContainer}>
            <View style={styles.bitcoinIcon}>
              <Text style={styles.bitcoinSymbol}>₿</Text>
            </View>
            <Text style={styles.questionText}>{question}</Text>
          </View>
        </Card>

        {/* BTC Price Threshold */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>BTC Price Threshold (USD)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>$</Text>
            <TextInput
              style={styles.input}
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
              placeholder="70000"
              placeholderTextColor={DesignColors.dark.muted}
            />
          </View>
        </View>

        {/* Expiration Days */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Expiration (Days from now)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={expirationDays}
              onChangeText={setExpirationDays}
              keyboardType="numeric"
              placeholder="7"
              placeholderTextColor={DesignColors.dark.muted}
            />
            <Text style={styles.suffix}>days</Text>
          </View>
          <Text style={styles.helperText}>
            Market will expire on: {new Date(expirationTimestamp * 1000).toLocaleDateString()}
          </Text>
        </View>

        {/* Initial Liquidity */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Initial Liquidity (MUSD)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={initialLiquidity}
              onChangeText={setInitialLiquidity}
              keyboardType="numeric"
              placeholder="1000"
              placeholderTextColor={DesignColors.dark.muted}
            />
            <Text style={styles.suffix}>MUSD</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.helperText}>Available:</Text>
            <Text style={styles.balanceValue}>
              {musdBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} MUSD
            </Text>
          </View>
        </View>

        {/* Summary Card */}
        <Card variant="elevated" style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Market Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Threshold:</Text>
            <Text style={styles.summaryValue}>
              ${threshold ? parseFloat(threshold).toLocaleString() : '0'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expiration:</Text>
            <Text style={styles.summaryValue}>
              {new Date(expirationTimestamp * 1000).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Initial Liquidity:</Text>
            <Text style={styles.summaryValue}>
              {initialLiquidity ? parseFloat(initialLiquidity).toLocaleString() : '0'} MUSD
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Yes Pool:</Text>
            <Text style={styles.summaryValue}>
              {initialLiquidity ? (parseFloat(initialLiquidity) / 2).toLocaleString() : '0'} MUSD
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>No Pool:</Text>
            <Text style={styles.summaryValue}>
              {initialLiquidity ? (parseFloat(initialLiquidity) / 2).toLocaleString() : '0'} MUSD
            </Text>
          </View>
        </Card>

        {/* Create Button */}
        <Button
          title={isCreating ? 'Creating Market...' : 'Create Market'}
          onPress={handleCreate}
          variant="primary"
          size="lg"
          style={styles.createButton}
          disabled={
            isCreating ||
            !threshold ||
            !expirationDays ||
            !initialLiquidity ||
            parseFloat(threshold) <= 0 ||
            parseFloat(expirationDays) <= 0 ||
            parseFloat(initialLiquidity) <= 0 ||
            parseFloat(initialLiquidity) > musdBalance
          }
        />

        {factoryError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{factoryError}</Text>
          </View>
        )}
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
    paddingBottom: 20,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    lineHeight: 20,
  },
  questionCard: {
    marginBottom: Spacing.lg,
  },
  questionLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.sm,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bitcoinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignColors.yellow.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bitcoinSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DesignColors.dark.primary,
  },
  questionText: {
    flex: 1,
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  prefix: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.lg.fontSize,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    color: DesignColors.light.white,
    fontSize: Typography.body.lg.fontSize,
  },
  suffix: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    marginLeft: Spacing.sm,
  },
  helperText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginTop: Spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  balanceValue: {
    color: DesignColors.yellow.primary,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
  },
  summaryValue: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  createButton: {
    marginTop: Spacing.md,
  },
  errorContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: DesignColors.error + '20',
    borderRadius: Radius.md,
  },
  errorText: {
    color: DesignColors.error,
    fontSize: Typography.body.sm.fontSize,
    textAlign: 'center',
  },
});

