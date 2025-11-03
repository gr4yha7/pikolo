import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { usePredictionMarket } from '@/hooks/usePredictionMarket';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Address } from 'viem';
import { formatUnits } from 'viem';

export default function MarketResolutionScreen() {
  const params = useLocalSearchParams<{ marketAddress?: string }>();
  const router = useRouter();
  
  const marketAddress = params.marketAddress as Address | undefined;
  
  const {
    marketData,
    isLoading,
    error,
    fetchMarketData,
  } = usePredictionMarket(marketAddress || null);

  // Market status and details
  const status = useMemo(() => {
    if (!marketData) return null;
    
    const isResolved = marketData.status === 1;
    const outcome = marketData.outcome; // 0 = No, 1 = Yes
    const threshold = formatUnits(marketData.threshold, 18);
    const resolvedPrice = marketData.resolvedPrice > 0n
      ? formatUnits(marketData.resolvedPrice, 18)
      : null;
    const expirationTime = Number(marketData.expirationTime) * 1000;
    const now = Date.now();
    const isExpired = now >= expirationTime;

    return {
      isResolved,
      outcome,
      outcomeText: outcome === 1 ? 'Yes' : 'No',
      threshold: parseFloat(threshold),
      resolvedPrice: resolvedPrice ? parseFloat(resolvedPrice) : null,
      expirationTime,
      isExpired,
      resolutionStatus: isResolved ? 'resolved' : isExpired ? 'expired' : 'pending',
    };
  }, [marketData]);

  // Calculate outcome explanation
  const outcomeExplanation = useMemo(() => {
    if (!status || !status.isResolved || !status.resolvedPrice) return null;

    const { resolvedPrice, threshold, outcomeText } = status;
    const above = resolvedPrice >= threshold;

    if (outcomeText === 'Yes') {
      return above
        ? `BTC price was $${resolvedPrice.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })} (above threshold: $${threshold.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}) → Outcome: Yes`
        : `BTC price was $${resolvedPrice.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })} (below threshold: $${threshold.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}) → Outcome: No`;
    } else {
      return above
        ? `BTC price was $${resolvedPrice.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })} (above threshold: $${threshold.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}) → Outcome: No`
        : `BTC price was $${resolvedPrice.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })} (below threshold: $${threshold.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}) → Outcome: Yes`;
    }
  }, [status]);

  if (isLoading && !marketData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <AppHeader title="Market Resolution" showClose={true} />
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
        <AppHeader title="Market Resolution" showClose={true} />
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

  const threshold = status?.threshold || 0;
  const question = `Will Bitcoin price be above $${threshold.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} by ${new Date(status?.expirationTime || Date.now()).toLocaleDateString()}?`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Market Resolution" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Market Question */}
        <Card variant="elevated" style={styles.questionCard}>
          <View style={styles.questionRow}>
            <View style={styles.bitcoinIcon}>
              <Text style={styles.bitcoinSymbol}>₿</Text>
            </View>
            <Text style={styles.question}>{question}</Text>
          </View>
        </Card>

        {/* Resolution Status */}
        <Card variant="elevated" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {status?.isResolved ? (
              <View style={[styles.statusBadge, styles.statusBadgeResolved]}>
                <Ionicons name="checkmark-circle" size={24} color={DesignColors.success} />
                <Text style={styles.statusText}>RESOLVED</Text>
              </View>
            ) : status?.isExpired ? (
              <View style={[styles.statusBadge, styles.statusBadgeExpired]}>
                <Ionicons name="time-outline" size={24} color={DesignColors.warning} />
                <Text style={styles.statusText}>EXPIRED - Pending Resolution</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.statusBadgePending]}>
                <Ionicons name="hourglass-outline" size={24} color={DesignColors.dark.muted} />
                <Text style={styles.statusText}>PENDING</Text>
              </View>
            )}
          </View>

          {status?.isResolved && status.resolvedPrice && (
            <>
              {/* Outcome */}
              <View style={styles.outcomeSection}>
                <Text style={styles.outcomeLabel}>Outcome:</Text>
                <View style={[
                  styles.outcomeBadge,
                  status.outcome === 1 ? styles.outcomeYes : styles.outcomeNo,
                ]}>
                  <Text style={styles.outcomeText}>{status.outcomeText}</Text>
                </View>
              </View>

              {/* Price Information */}
              <View style={styles.priceSection}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>BTC Price at Resolution:</Text>
                  <Text style={styles.priceValue}>
                    ${status.resolvedPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Threshold:</Text>
                  <Text style={styles.priceValue}>
                    ${status.threshold.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                </View>
                {outcomeExplanation && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationText}>{outcomeExplanation}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {status?.isExpired && !status.isResolved && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingText}>
                This market has expired and is awaiting resolution. The resolution process will:
              </Text>
              <View style={styles.pendingSteps}>
                <Text style={styles.pendingStep}>1. Fetch BTC price from Mezo PriceFeed</Text>
                <Text style={styles.pendingStep}>2. Compare price to threshold</Text>
                <Text style={styles.pendingStep}>3. Resolve market automatically</Text>
              </View>
              <Text style={styles.pendingNote}>
                Resolution typically occurs within a few minutes of expiration.
              </Text>
            </View>
          )}

          {status && !status.isExpired && !status.isResolved && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingText}>
                This market is still active. Expiration: {new Date(status.expirationTime).toLocaleString()}
              </Text>
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        {status?.isResolved && (
          <Button
            title="Redeem Winnings"
            onPress={() => router.push(`/redeem?marketAddress=${marketAddress}` as any)}
            variant="primary"
            size="lg"
            style={styles.actionButton}
          />
        )}

        <Button
          title="View Market Details"
          onPress={() => router.push(`/prediction/${marketAddress}` as any)}
          variant="secondary"
          size="lg"
          style={styles.actionButton}
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
  question: {
    flex: 1,
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
  },
  statusCard: {
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  statusBadgeResolved: {
    backgroundColor: DesignColors.success + '20',
  },
  statusBadgeExpired: {
    backgroundColor: DesignColors.warning + '20',
  },
  statusBadgePending: {
    backgroundColor: DesignColors.dark.secondary,
  },
  statusText: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '700',
  },
  outcomeSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  outcomeLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    marginBottom: Spacing.sm,
  },
  outcomeBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  outcomeYes: {
    backgroundColor: DesignColors.success,
  },
  outcomeNo: {
    backgroundColor: DesignColors.error,
  },
  outcomeText: {
    color: DesignColors.dark.primary,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: '700',
  },
  priceSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  priceLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
  },
  priceValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
  },
  explanationContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
  },
  explanationText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    textAlign: 'center',
  },
  pendingSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
  },
  pendingText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    marginBottom: Spacing.md,
  },
  pendingSteps: {
    marginLeft: Spacing.md,
    marginBottom: Spacing.md,
  },
  pendingStep: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  pendingNote: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    fontStyle: 'italic',
  },
  actionButton: {
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

