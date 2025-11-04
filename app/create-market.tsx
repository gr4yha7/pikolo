import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { useMarketFactory } from '@/hooks/useMarketFactory';
import { setMarketMetadata } from '@/utils/market-metadata';
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
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseEther } from 'viem';

export default function CreateMarketScreen() {
  const router = useRouter();
  const { wallet, refreshBalances } = useWallet();
  
  // Get factory address from environment
  const factoryAddress = (process.env.EXPO_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS || '') as `0x${string}` | null;
  
  const {
    createMarket,
    isLoading: factoryLoading,
    error: factoryError,
  } = useMarketFactory(factoryAddress);

  const [threshold, setThreshold] = useState('');
  const [expirationMinutes, setExpirationMinutes] = useState('60');
  const [initialLiquidity, setInitialLiquidity] = useState('');
  const [isAboveThreshold, setIsAboveThreshold] = useState(true); // true = above, false = below
  const [isCreating, setIsCreating] = useState(false);

  // Calculate expiration timestamp (in minutes for testing)
  const expirationTimestamp = Math.floor(Date.now() / 1000) + (parseInt(expirationMinutes || '60') * 60);

  // Get MUSD balance
  const musdBalance = wallet.musdBalance ? parseFloat(wallet.musdBalance) : 0;

  // Auto-generate market question
  const question = threshold
    ? `Will Bitcoin price be ${isAboveThreshold ? 'above' : 'below'} $${parseFloat(threshold).toLocaleString(undefined, {
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

    if (!expirationMinutes || parseInt(expirationMinutes) <= 0) {
      Alert.alert('Error', 'Please enter valid expiration minutes (minimum 1 minute)');
      return;
    }

    // Ensure expiration is at least 1 minute in the future
    const minExpiration = Math.floor(Date.now() / 1000) + 60;
    if (expirationTimestamp < minExpiration) {
      Alert.alert('Error', 'Expiration time must be at least 1 minute in the future');
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

      // Handle success - result should have marketAddress
      const marketAddress = result?.marketAddress;
      let successMessage = 'Market created successfully!';
      
      // Store market metadata (isAboveThreshold) since it's not stored on-chain
      if (marketAddress && typeof marketAddress === 'string' && marketAddress.startsWith('0x')) {
        await setMarketMetadata(marketAddress as `0x${string}`, { isAboveThreshold });
        successMessage += ` Address: ${marketAddress.slice(0, 10)}...`;
      }

      // Refresh wallet balances after successful market creation
      await refreshBalances();

      Alert.alert(
        'Success',
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
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

        {/* Market Direction Selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Market Direction</Text>
          <View style={styles.directionSelector}>
            <TouchableOpacity
              style={[
                styles.directionButton,
                isAboveThreshold && styles.directionButtonActive,
              ]}
              onPress={() => setIsAboveThreshold(true)}>
              <Text
                style={[
                  styles.directionButtonText,
                  isAboveThreshold && styles.directionButtonTextActive,
                ]}>
                Above Threshold
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionButton,
                !isAboveThreshold && styles.directionButtonActive,
              ]}
              onPress={() => setIsAboveThreshold(false)}>
              <Text
                style={[
                  styles.directionButtonText,
                  !isAboveThreshold && styles.directionButtonTextActive,
                ]}>
                Below Threshold
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Expiration Minutes */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Expiration (Minutes from now)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={expirationMinutes}
              onChangeText={setExpirationMinutes}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={DesignColors.dark.muted}
            />
            <Text style={styles.suffix}>minutes</Text>
          </View>
          <Text style={styles.helperText}>
            Market will expire on: {new Date(expirationTimestamp * 1000).toLocaleString()}
            {parseInt(expirationMinutes || '0') >= 60 && (
              <Text> ({Math.floor(parseInt(expirationMinutes || '0') / 60)} hour{Math.floor(parseInt(expirationMinutes || '0') / 60) !== 1 ? 's' : ''})</Text>
            )}
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
            <Text style={styles.summaryLabel}>Direction:</Text>
            <Text style={styles.summaryValue}>
              {isAboveThreshold ? 'Above' : 'Below'} Threshold
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Threshold:</Text>
            <Text style={styles.summaryValue}>
              ${threshold ? parseFloat(threshold).toLocaleString() : '0'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expiration:</Text>
            <Text style={styles.summaryValue}>
              {new Date(expirationTimestamp * 1000).toLocaleString()}
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
            !expirationMinutes ||
            !initialLiquidity ||
            parseFloat(threshold) <= 0 ||
            parseInt(expirationMinutes) <= 0 ||
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
  directionSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  directionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: DesignColors.dark.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionButtonActive: {
    backgroundColor: DesignColors.yellow.primary + '20',
    borderColor: DesignColors.yellow.primary,
  },
  directionButtonText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  directionButtonTextActive: {
    color: DesignColors.yellow.primary,
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

