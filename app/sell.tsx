import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { usePredictionMarket } from '@/hooks/usePredictionMarket';
import { calculateAmountOut } from '@/utils/amm';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { formatEther, formatUnits, parseEther } from 'viem';

export default function SellScreen() {
  const params = useLocalSearchParams<{ marketAddress?: string; isYes?: string }>();
  const router = useRouter();
  const { wallet } = useWallet();
  
  const marketAddress = params.marketAddress as `0x${string}` | undefined;
  const isYes = params.isYes === 'true' || params.isYes === '1';
  
  const {
    marketData,
    reserves,
    userPosition,
    isLoading: marketLoading,
    error: marketError,
    sellShares,
    getSharePrice,
    estimateAmountOut,
    fetchMarketData,
  } = usePredictionMarket(marketAddress || null);

  const availableShares = isYes ? userPosition?.yesShares || 0n : userPosition?.noShares || 0n;
  const availableSharesFormatted = formatEther(availableShares);
  
  const [sharesToSell, setSharesToSell] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [isSelling, setIsSelling] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState<bigint>(0n);
  const [sharePrice, setSharePrice] = useState<bigint>(0n);

  // Fetch share price and estimate amount when shares change
  useEffect(() => {
    const updateEstimates = async () => {
      if (!marketAddress || !sharesToSell || parseFloat(sharesToSell) <= 0 || availableShares === 0n) {
        setEstimatedAmount(0n);
        setSharePrice(0n);
        return;
      }

      try {
        // Get current share price
        const price = await getSharePrice(isYes);
        setSharePrice(price);

        // Estimate MUSD output using hook or direct calculation
        const sharesInWei = parseEther(sharesToSell);
        if (reserves && reserves.reserveYes > 0n && reserves.reserveNo > 0n && sharesInWei <= availableShares) {
          let amount = 0n;
          try {
            amount = await estimateAmountOut(isYes, sharesInWei);
          } catch {
            // Fallback to direct calculation if hook method fails
            amount = calculateAmountOut(
              sharesInWei,
              isYes ? reserves.reserveYes : reserves.reserveNo,
              isYes ? reserves.reserveNo : reserves.reserveYes,
              50, // 0.5% fee
            );
          }
          setEstimatedAmount(amount);
        } else {
          setEstimatedAmount(0n);
        }
      } catch (error) {
        console.error('Error estimating amount:', error);
        // Fallback to direct calculation
        if (reserves && sharesToSell) {
          const sharesInWei = parseEther(sharesToSell);
          if (sharesInWei <= availableShares) {
            const amount = calculateAmountOut(
              sharesInWei,
              isYes ? reserves.reserveYes : reserves.reserveNo,
              isYes ? reserves.reserveNo : reserves.reserveYes,
              50,
            );
            setEstimatedAmount(amount);
          }
        }
      }
    };

    updateEstimates();
  }, [sharesToSell, isYes, marketAddress, reserves, getSharePrice, estimateAmountOut, availableShares]);

  // Update slider when user types
  useEffect(() => {
    if (availableShares > 0n) {
      const sharesNum = parseFloat(sharesToSell || '0');
      const availableNum = parseFloat(availableSharesFormatted);
      if (!isNaN(sharesNum) && !isNaN(availableNum) && availableNum > 0) {
        const percent = Math.round((sharesNum / availableNum) * 100);
        setSliderValue(Math.min(100, Math.max(0, percent)));
      } else if (sharesToSell === '') {
        setSliderValue(0);
      }
    }
  }, [sharesToSell, availableSharesFormatted]);

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    const availableNum = parseFloat(availableSharesFormatted);
    if (!isNaN(availableNum) && availableNum > 0) {
      const calculatedShares = (availableNum * value) / 100;
      setSharesToSell(calculatedShares.toFixed(6));
    }
  };

  const handleSharesChange = (text: string) => {
    // Only allow numbers and decimal point
    const sanitized = text.replace(/[^0-9.]/g, '');
    setSharesToSell(sanitized);
  };

  const handleSell = async () => {
    if (!marketAddress) {
      Alert.alert('Error', 'Market address is required');
      return;
    }

    if (!sharesToSell || parseFloat(sharesToSell) <= 0) {
      Alert.alert('Error', 'Please enter an amount of shares to sell');
      return;
    }

    const sharesInWei = parseEther(sharesToSell);
    if (sharesInWei > availableShares) {
      Alert.alert('Error', 'Insufficient shares to sell');
      return;
    }

    try {
      setIsSelling(true);
      
      const result = await sellShares({
        isYes,
        sharesAmount: sharesInWei,
      });

      Alert.alert(
        'Success',
        `Successfully sold shares! Transaction: ${result.hash.slice(0, 10)}...`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sell shares';
      Alert.alert('Error', errorMessage);
      console.error('Sell error:', error);
    } finally {
      setIsSelling(false);
    }
  };

  // Calculate probability from share price
  const probability = sharePrice > 0n 
    ? (Number(sharePrice) / 1e18) * 100
    : 50;

  const pricePerShare = sharePrice > 0n 
    ? Number(sharePrice) / 1e18 
    : 0;

  const amountOut = formatEther(estimatedAmount);

  if (!marketAddress) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Sell" showClose={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Market address is required</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (marketLoading && !marketData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Sell" showClose={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DesignColors.yellow.primary} />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (marketError || !marketData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Sell" showClose={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {marketError || 'Failed to load market data'}
          </Text>
          <Button
            title="Retry"
            onPress={fetchMarketData}
            variant="primary"
            size="md"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (availableShares === 0n) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Sell" showClose={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            You don't have any {isYes ? 'Yes' : 'No'} shares to sell
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
            size="md"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Format threshold (scaled by 1e18)
  const threshold = formatUnits(marketData.threshold, 18);
  const question = `Will Bitcoin price be ${isYes ? 'above' : 'below'} $${threshold} by ${new Date(Number(marketData.expirationTime) * 1000).toLocaleDateString()}?`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Sell" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Question Card */}
        <Card variant="elevated" style={styles.questionCard}>
          <View style={styles.questionRow}>
            <View style={styles.bitcoinIcon}>
              <Text style={styles.bitcoinSymbol}>₿</Text>
            </View>
            <Text style={styles.question}>
              {question}
            </Text>
          </View>
          <View style={styles.predictionRow}>
            <Text style={styles.predictionText}>{isYes ? 'Yes' : 'No'}</Text>
            <Ionicons
              name="refresh"
              size={16}
              color={DesignColors.chart.line}
            />
            <Text style={styles.chanceText}>{probability.toFixed(1)}% chance</Text>
          </View>
        </Card>

        {/* Shares Input */}
        <View style={styles.amountContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={sharesToSell}
              onChangeText={handleSharesChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={DesignColors.dark.muted}
            />
            <TouchableOpacity style={styles.eyeIcon}>
              <Ionicons
                name="eye-outline"
                size={20}
                color={DesignColors.yellow.primary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Available shares:</Text>
            <Text style={styles.balanceValue}>
              {parseFloat(availableSharesFormatted).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}
            </Text>
          </View>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderWrapper}>
            <Slider
              minimumValue={0}
              maximumValue={100}
              value={sliderValue}
              onValueChange={handleSliderChange}
              minimumTrackTintColor={DesignColors.yellow.primary}
              maximumTrackTintColor={DesignColors.light.white}
              thumbTintColor={DesignColors.yellow.primary}
            />
            <View
              style={[
                styles.percentBadge,
                { left: `${sliderValue}%` },
              ]}>
              <Text style={styles.percentText}>{sliderValue}%</Text>
            </View>
          </View>
          <Text style={styles.profitText}>
            Estimated MUSD: {parseFloat(amountOut).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </Text>
        </View>

        {/* Price and Amount Info */}
        <Card variant="elevated" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Price per share</Text>
              <View style={styles.infoValueRow}>
                <Ionicons
                  name="diamond"
                  size={16}
                  color={DesignColors.yellow.primary}
                />
                <Text style={styles.infoValue}>
                  {pricePerShare > 0
                    ? pricePerShare.toFixed(4)
                    : '...'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>MUSD Received</Text>
              <Text style={styles.infoValue}>
                {parseFloat(amountOut).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Sell Button */}
        <Button
          title={isSelling ? 'Selling...' : 'Sell'}
          onPress={handleSell}
          variant="primary"
          size="lg"
          style={styles.sellButton}
          disabled={isSelling || !sharesToSell || parseFloat(sharesToSell) <= 0 || parseEther(sharesToSell || '0') > availableShares}
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
    paddingBottom: 20,
  },
  questionCard: {
    marginBottom: Spacing.lg,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
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
  question: {
    flex: 1,
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  predictionText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  chanceText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  amountContainer: {
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 64,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    color: DesignColors.light.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  eyeIcon: {
    padding: Spacing.xs,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  balanceValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
    marginTop: 2,
  },
  sliderContainer: {
    marginBottom: Spacing.lg,
  },
  sliderWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  percentBadge: {
    position: 'absolute',
    top: -30,
    backgroundColor: DesignColors.dark.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginLeft: -20,
  },
  percentText: {
    color: DesignColors.yellow.primary,
    fontSize: Typography.caption.md.fontSize,
    fontWeight: '600',
  },
  profitText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    textAlign: 'center',
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: DesignColors.light.white,
    marginHorizontal: Spacing.md,
  },
  sellButton: {
    marginTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    color: DesignColors.error,
    fontSize: Typography.body.md.fontSize,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
});

