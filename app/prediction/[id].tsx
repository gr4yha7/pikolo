import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { usePredictionMarket } from '@/hooks/usePredictionMarket';
import { formatShares } from '@/utils/format-shares';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Address } from 'viem';
import { formatEther, formatUnits } from 'viem';

export default function PredictionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; marketAddress?: string }>();
  const router = useRouter();
  
  // Support both id (legacy) and marketAddress (new)
  const marketAddress = (params.marketAddress || params.id) as Address | undefined;
  
  const {
    marketData,
    reserves,
    userPosition,
    isLoading,
    error,
    getSharePrice,
    fetchMarketData,
    resolveMarket,
  } = usePredictionMarket(marketAddress || null);

  // Calculate probabilities and prices
  const [yesProbability, noProbability, yesPrice, noPrice] = useMemo(() => {
    if (!reserves || !marketData) {
      return [50, 50, 0.5, 0.5];
    }

    const total = reserves.reserveYes + reserves.reserveNo;
    if (total === 0n) {
      return [50, 50, 0.5, 0.5];
    }

    // Yes probability = No reserve / Total
    const yesProb = (Number(reserves.reserveNo) / Number(total)) * 100;
    const noProb = (Number(reserves.reserveYes) / Number(total)) * 100;

    // Price per share (in MUSD, scaled by 1e18)
    const yesPriceRaw = (reserves.reserveNo * BigInt(1e18)) / total;
    const noPriceRaw = (reserves.reserveYes * BigInt(1e18)) / total;

    return [
      yesProb,
      noProb,
      Number(yesPriceRaw) / 1e18,
      Number(noPriceRaw) / 1e18,
    ];
  }, [reserves, marketData]);

  // Format market info
  const threshold = marketData ? formatUnits(marketData.threshold, 18) : '0';
  const expirationTime = marketData ? Number(marketData.expirationTime) * 1000 : Date.now();
  const expirationDate = new Date(expirationTime);
  const now = Date.now();
  const timeDiff = expirationTime - now;
  const isExpired = timeDiff <= 0;
  
  // Format time to close with more precision (for minute-based testing)
  let timeToClose: string;
  if (isExpired) {
    timeToClose = 'Expired';
  } else {
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      timeToClose = `${days} ${days === 1 ? 'day' : 'days'}${hours > 0 ? ` ${hours}h` : ''}`;
    } else if (hours > 0) {
      timeToClose = `${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes > 0 ? ` ${minutes}m` : ''}`;
    } else {
      timeToClose = `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
    }
  }

  // Total volume (simplified - would come from events in production)
  const totalVolume = reserves
    ? formatEther(reserves.reserveYes + reserves.reserveNo)
    : '0';

  // Get isAboveThreshold from metadata
  const [isAboveThreshold, setIsAboveThreshold] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchMetadata = async () => {
      if (marketAddress) {
        const metadata = await import('@/utils/market-metadata').then(m => m.getMarketIsAboveThreshold(marketAddress));
        setIsAboveThreshold(metadata);
      }
    };
    fetchMetadata();
  }, [marketAddress]);

  const question = marketData
    ? `Will Bitcoin price be ${isAboveThreshold ? 'above' : 'below'} $${parseFloat(threshold).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} by ${expirationDate.toLocaleDateString()}?`
    : 'Loading...';

  // Check if market is resolved
  const isResolved = marketData?.status === 1;
  const outcome = marketData?.outcome; // 0 = No, 1 = Yes
  const resolvedPrice = marketData?.resolvedPrice
    ? formatUnits(marketData.resolvedPrice, 18)
    : null;

  // User's positions
  const userYesShares = userPosition?.yesShares || 0n;
  const userNoShares = userPosition?.noShares || 0n;
  const hasPositions = userYesShares > 0n || userNoShares > 0n;

  const handleBuyYes = () => {
    if (!marketAddress) return;
    router.push({
      pathname: '/buy',
      params: { marketAddress, isYes: 'true' },
    });
  };

  const handleBuyNo = () => {
    if (!marketAddress) return;
    router.push({
      pathname: '/buy',
      params: { marketAddress, isYes: 'false' },
    });
  };

  const handleSellYes = () => {
    if (!marketAddress) return;
    router.push(`/sell?marketAddress=${marketAddress}&isYes=true` as any);
  };

  const handleSellNo = () => {
    if (!marketAddress) return;
    router.push(`/sell?marketAddress=${marketAddress}&isYes=false` as any);
  };

  const handleRedeem = () => {
    if (!marketAddress) return;
    router.push(`/redeem?marketAddress=${marketAddress}` as any);
  };

  const [isResolving, setIsResolving] = useState(false);

  const handleResolveMarket = async () => {
    if (!marketAddress) return;

    try {
      setIsResolving(true);
      const result = await resolveMarket();
      
      Alert.alert(
        'Market Resolved!',
        `Market has been resolved successfully!\n\nOutcome: ${result.outcome}\nPrice: $${result.price?.toLocaleString()}\n\nTransaction: ${result.txHash?.slice(0, 10)}...`,
        [{ text: 'OK' }],
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve market';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading && !marketData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DesignColors.yellow.primary} />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !marketData || !marketAddress) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={DesignColors.error} />
          <Text style={styles.errorText}>
            {error || 'Market not found'}
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Prediction Detail Card */}
        <Card variant="elevated" style={styles.predictionCard}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Ionicons
                name="time-outline"
                size={16}
                color={DesignColors.light.white}
              />
              <Text style={styles.headerText}>{timeToClose}</Text>
            </View>
            <View style={styles.headerRight}>
              <Ionicons
                name="eye-outline"
                size={16}
                color={DesignColors.light.white}
              />
              <Text style={styles.headerText}>
                {parseFloat(totalVolume).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })} MUSD vol.
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          {isResolved && (
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, outcome === 1 ? styles.statusWin : styles.statusLose]} />
              <Text style={styles.statusText}>
                RESOLVED - {outcome === 1 ? 'YES' : 'NO'}
              </Text>
              {resolvedPrice && (
                <Text style={styles.resolvedPriceText}>
                  BTC Price: ${parseFloat(resolvedPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </Text>
              )}
            </View>
          )}

          {/* Question */}
          <View style={styles.questionRow}>
            <View style={styles.bitcoinIcon}>
              <Text style={styles.bitcoinSymbol}>₿</Text>
            </View>
            <Text style={styles.question}>{question}</Text>
          </View>

          {/* Probabilities */}
          <View style={styles.probabilityRow}>
            <View style={styles.probabilityItem}>
              <Text style={styles.probabilityLabel}>Yes</Text>
              <Text style={styles.probabilityValue}>{yesProbability.toFixed(1)}%</Text>
            </View>
            <View style={styles.probabilityDivider} />
            <View style={styles.probabilityItem}>
              <Text style={styles.probabilityLabel}>No</Text>
              <Text style={styles.probabilityValue}>{noProbability.toFixed(1)}%</Text>
            </View>
          </View>

          {/* Probability Chart */}
          <Card variant="elevated" style={styles.chartCard}>
            <Text style={styles.chartTitle}>Market Odds</Text>
            <BarChart
              data={{
                labels: ['Yes', 'No'],
                datasets: [
                  {
                    data: [yesProbability, noProbability],
                  },
                ],
              }}
              width={Dimensions.get('window').width - Spacing.md * 4}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              yAxisInterval={25}
              chartConfig={{
                backgroundColor: DesignColors.dark.secondary,
                backgroundGradientFrom: DesignColors.dark.secondary,
                backgroundGradientTo: DesignColors.dark.secondary,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: Radius.md,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: DesignColors.dark.muted,
                  strokeWidth: 1,
                },
                propsForLabels: {
                  fontSize: 12,
                },
                barPercentage: 0.6,
                fillShadowGradient: DesignColors.yellow.primary,
                fillShadowGradientOpacity: 0.8,
              }}
              style={{
                marginVertical: Spacing.sm,
                borderRadius: Radius.md,
              }}
              fromZero={true}
              showValuesOnTopOfBars={true}
              withInnerLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
            />
          </Card>

          {/* Probability Over Time Chart (Line Chart) */}
          <Card variant="elevated" style={styles.chartCard}>
            <Text style={styles.chartTitle}>Probability Over Time</Text>
            <LineChart
              data={{
                labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
                datasets: [
                  {
                    data: [
                      yesProbability * 0.95,
                      yesProbability * 0.97,
                      yesProbability * 0.99,
                      yesProbability * 1.01,
                      yesProbability * 1.02,
                      yesProbability,
                    ],
                    color: (opacity = 1) => DesignColors.success,
                    strokeWidth: 2,
                  },
                  {
                    data: [
                      noProbability * 0.95,
                      noProbability * 0.97,
                      noProbability * 0.99,
                      noProbability * 1.01,
                      noProbability * 1.02,
                      noProbability,
                    ],
                    color: (opacity = 1) => DesignColors.error,
                    strokeWidth: 2,
                  },
                ],
                legend: ['Yes', 'No'],
              }}
              width={Dimensions.get('window').width - Spacing.md * 4}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              yAxisInterval={25}
              chartConfig={{
                backgroundColor: DesignColors.dark.secondary,
                backgroundGradientFrom: DesignColors.dark.secondary,
                backgroundGradientTo: DesignColors.dark.secondary,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: Radius.md,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: DesignColors.dark.muted,
                  strokeWidth: 1,
                },
                propsForLabels: {
                  fontSize: 12,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: DesignColors.yellow.primary,
                },
              }}
              style={{
                marginVertical: Spacing.sm,
                borderRadius: Radius.md,
              }}
              bezier
              withInnerLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={false}
            />
          </Card>

          {/* User Positions */}
          {hasPositions && (
            <View style={styles.positionCard}>
              <Text style={styles.positionTitle}>Your Positions</Text>
              <View style={styles.positionRow}>
                {userYesShares > 0n && (
                  <View style={styles.positionItem}>
                    <Text style={styles.positionLabel}>Yes Shares:</Text>
                    <Text style={styles.positionValue}>
                      {formatShares(userYesShares)}
                    </Text>
                  </View>
                )}
                {userNoShares > 0n && (
                  <View style={styles.positionItem}>
                    <Text style={styles.positionLabel}>No Shares:</Text>
                    <Text style={styles.positionValue}>
                      {formatShares(userNoShares)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Resolve Market Button (if expired but not resolved) */}
          {!isResolved && isExpired && (
            <Button
              title={isResolving ? 'Resolving...' : 'Resolve Market'}
              onPress={handleResolveMarket}
              variant="primary"
              size="lg"
              style={styles.resolveButton}
              disabled={isResolving || isLoading}
            />
          )}

          {/* Action Buttons */}
          {isResolved ? (
            // Show redeem button if resolved and user has winning shares
            (outcome === 1 ? userYesShares > 0n : userNoShares > 0n) && (
              <Button
                title="Redeem Winning Shares"
                onPress={handleRedeem}
                variant="primary"
                size="lg"
                style={styles.actionButton}
              />
            )
          ) : !isExpired && !isResolved ? (
            // Show buy/sell buttons if not expired and not resolved
            <View style={styles.actionButtons}>
              <View style={styles.actionButtonContainer}>
                <Button
                  title="Buy Yes"
                  onPress={handleBuyYes}
                  variant="primary"
                  size="lg"
                  style={styles.actionButton}
                  rightIcon={
                    <View style={styles.priceBadgePrimary}>
                      <Text style={styles.priceBadgeTextPrimary}>
                        {yesPrice.toFixed(4)}
                      </Text>
                    </View>
                  }
                />
                {userYesShares > 0n && (
                  <TouchableOpacity
                    style={styles.sellButton}
                    onPress={handleSellYes}>
                    <Text style={styles.sellButtonText}>Sell</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.actionButtonContainer}>
                <Button
                  title="Buy No"
                  onPress={handleBuyNo}
                  variant="secondary"
                  size="lg"
                  style={styles.actionButton}
                  rightIcon={
                    <View style={styles.priceBadgeSecondary}>
                      <Text style={styles.priceBadgeTextSecondary}>
                        {noPrice.toFixed(4)}
                      </Text>
                    </View>
                  }
                />
                {userNoShares > 0n && (
                  <TouchableOpacity
                    style={styles.sellButton}
                    onPress={handleSellNo}>
                    <Text style={styles.sellButtonText}>Sell</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}
        </Card>
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
  predictionCard: {
    marginTop: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    color: DesignColors.light.white,
    fontSize: Typography.caption.md.fontSize,
  },
  statusBadge: {
    backgroundColor: DesignColors.dark.secondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: Spacing.xs,
  },
  statusWin: {
    backgroundColor: DesignColors.success,
  },
  statusLose: {
    backgroundColor: DesignColors.error,
  },
  statusText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  resolvedPriceText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  probabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
  },
  probabilityItem: {
    flex: 1,
    alignItems: 'center',
  },
  probabilityLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  probabilityValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
  },
  probabilityDivider: {
    width: 1,
    height: 40,
    backgroundColor: DesignColors.dark.muted,
  },
  chartCard: {
    marginBottom: Spacing.md,
  },
  chartTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  positionCard: {
    backgroundColor: DesignColors.dark.secondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  positionTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  positionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  positionItem: {
    flex: 1,
  },
  positionLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  positionValue: {
    color: DesignColors.yellow.primary,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButtonContainer: {
    flex: 1,
  },
  actionButton: {
    flex: 1,
  },
  resolveButton: {
    marginBottom: Spacing.md,
  },
  priceBadgePrimary: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  priceBadgeTextPrimary: {
    color: DesignColors.light.white,
    fontSize: Typography.caption.md.fontSize,
    fontWeight: '700',
  },
  priceBadgeSecondary: {
    backgroundColor: DesignColors.yellow.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  priceBadgeTextSecondary: {
    color: DesignColors.dark.primary,
    fontSize: Typography.caption.md.fontSize,
    fontWeight: '700',
  },
  sellButton: {
    marginTop: Spacing.xs,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  sellButtonText: {
    color: DesignColors.error,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
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
    gap: Spacing.md,
  },
  errorText: {
    color: DesignColors.error,
    fontSize: Typography.body.md.fontSize,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.md,
  },
});
