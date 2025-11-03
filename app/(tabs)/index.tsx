import { AppHeader } from '@/components/app-header';
import { PredictionCard } from '@/components/prediction-card';
import { SearchBar } from '@/components/search-bar';
import { DesignColors, Spacing } from '@/constants/theme';
import { useMarketFactory } from '@/hooks/useMarketFactory';
import { PredictionMarketClient } from '@/lib/contracts/PredictionMarket';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Address } from 'viem';
import { createPublicClient, formatEther, formatUnits, http } from 'viem';

// Mezo testnet chain definition
const mezoTestnetChain = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Bitcoin',
    symbol: 'BTC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.test.mezo.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mezo Explorer',
      url: 'https://explorer.test.mezo.org',
    },
  },
  testnet: true,
};

interface MarketDisplay {
  id: Address;
  marketAddress: Address;
  question: string;
  prediction: 'Yes' | 'No';
  chance: number;
  timeToClose: string;
  volume: string;
  yesPrice: number;
  noPrice: number;
  yesProfit: string;
  noProfit: string;
}

export default function HomeScreen() {
  // Get factory address from environment
  const factoryAddress = (process.env.EXPO_PUBLIC_PREDICTION_MARKET_FACTORY_ADDRESS || '') as Address | null;
  
  const {
    allMarkets,
    isLoading: factoryLoading,
    error: factoryError,
    fetchAllMarkets,
  } = useMarketFactory(factoryAddress);

  const [markets, setMarkets] = useState<MarketDisplay[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);

  // Fetch market data for each market address
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!allMarkets || allMarkets.length === 0) {
        setMarkets([]);
        return;
      }

      setIsLoadingMarkets(true);
      try {
        const publicClient = createPublicClient({
          chain: mezoTestnetChain,
          transport: http(mezoTestnetChain.rpcUrls.default.http[0]),
        });

        const marketPromises = allMarkets.map(async (marketAddress) => {
          try {
            const marketClient = new PredictionMarketClient(
              marketAddress,
              publicClient,
              undefined, // No wallet client needed for read operations
            );

            const [marketData, reserves] = await Promise.all([
              marketClient.getMarketData(),
              marketClient.getReserves(),
            ]);

            // Check if market is resolved
            const isResolved = marketData.status === 1;
            if (isResolved) {
              return null; // Skip resolved markets for now (can be filtered differently)
            }

            // Calculate probabilities
            const total = reserves.reserveYes + reserves.reserveNo;
            const yesProb = total > 0n
              ? (Number(reserves.reserveNo) / Number(total)) * 100
              : 50;

            // Calculate prices
            const yesPriceRaw = total > 0n
              ? (reserves.reserveNo * BigInt(1e18)) / total
              : BigInt(0.5 * 1e18);
            const noPriceRaw = total > 0n
              ? (reserves.reserveYes * BigInt(1e18)) / total
              : BigInt(0.5 * 1e18);

            const yesPrice = Number(yesPriceRaw) / 1e18;
            const noPrice = Number(noPriceRaw) / 1e18;

            // Format threshold and time
            const threshold = formatUnits(marketData.threshold, 18);
            const expirationTime = Number(marketData.expirationTime) * 1000;
            const now = Date.now();
            const daysToExpire = Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24));
            const timeToClose = daysToExpire > 0
              ? `${daysToExpire} ${daysToExpire === 1 ? 'day' : 'days'} to close`
              : 'Expired';

            // Total volume (simplified)
            const volume = formatEther(reserves.reserveYes + reserves.reserveNo);

            // Calculate potential profit percentages (simplified: assuming initial buy at current price)
            // Profit = (currentPrice / buyPrice - 1) * 100
            // For MVP, we'll calculate based on current share price vs initial price (assume 0.5 as initial)
            const initialPrice = 0.5; // Assume 50/50 start
            const yesProfitPercent = yesPrice > 0 && initialPrice > 0
              ? ((yesPrice / initialPrice - 1) * 100)
              : 0;
            const noProfitPercent = noPrice > 0 && initialPrice > 0
              ? ((noPrice / initialPrice - 1) * 100)
              : 0;

            return {
              id: marketAddress,
              marketAddress,
              question: `Will Bitcoin price be above $${parseFloat(threshold).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })} by ${new Date(expirationTime).toLocaleDateString()}?`,
              prediction: yesProb > 50 ? 'Yes' : 'No' as const,
              chance: Math.round(yesProb > 50 ? yesProb : 100 - yesProb),
              timeToClose,
              volume: `${parseFloat(volume) >= 1000 ? (parseFloat(volume) / 1000).toFixed(1) + 'k' : parseFloat(volume).toFixed(0)} vol.`,
              yesPrice,
              noPrice,
              yesProfit: yesProfitPercent > 0 ? `+${yesProfitPercent.toFixed(1)}%` : `${yesProfitPercent.toFixed(1)}%`,
              noProfit: noProfitPercent > 0 ? `+${noProfitPercent.toFixed(1)}%` : `${noProfitPercent.toFixed(1)}%`,
            };
          } catch (error) {
            console.error(`Error fetching market ${marketAddress}:`, error);
            return null;
          }
        });

        const marketResults = await Promise.all(marketPromises);
        setMarkets(marketResults.filter((m) => m !== null) as MarketDisplay[]);
      } catch (error) {
        console.error('Error fetching markets:', error);
      } finally {
        setIsLoadingMarkets(false);
      }
    };

    if (allMarkets && allMarkets.length > 0) {
      fetchMarketData();
    } else {
      setMarkets([]);
    }
  }, [allMarkets]);

  // Refresh markets periodically
  useEffect(() => {
    if (factoryAddress) {
      fetchAllMarkets();
      const interval = setInterval(() => {
        fetchAllMarkets();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [factoryAddress, fetchAllMarkets]);

  const isLoading = factoryLoading || isLoadingMarkets;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <SearchBar placeholder="Bitcoin" />
        {isLoading && markets.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={DesignColors.yellow.primary} />
            <Text style={styles.loadingText}>Loading markets...</Text>
          </View>
        ) : factoryError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{factoryError}</Text>
            <Text style={styles.errorSubtext}>Make sure the factory address is configured.</Text>
          </View>
        ) : markets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No markets available</Text>
            <Text style={styles.emptySubtext}>Create a new market to get started!</Text>
          </View>
        ) : (
          <View style={styles.predictionsContainer}>
            {markets.map((prediction) => (
              <PredictionCard
                key={prediction.id}
                id={prediction.marketAddress}
                image={require('@/assets/images/icon.png')}
                question={prediction.question}
                prediction={prediction.prediction}
                chance={prediction.chance}
                timeToClose={prediction.timeToClose}
                volume={prediction.volume}
                yesProfit={prediction.yesProfit}
                noProfit={prediction.noProfit}
                yesPrice={prediction.yesPrice}
                noPrice={prediction.noPrice}
              />
            ))}
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
    paddingBottom: 20,
  },
  predictionsContainer: {
    marginTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    color: DesignColors.light.white,
    fontSize: 15,
    marginTop: Spacing.md,
  },
  errorContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    color: DesignColors.error,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorSubtext: {
    color: DesignColors.dark.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: DesignColors.light.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    color: DesignColors.dark.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});
