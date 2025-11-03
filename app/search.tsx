import { AppHeader } from '@/components/app-header';
import { CategoryTabs } from '@/components/category-tabs';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = ['Top', 'Crypto', 'Cybersport', 'Culture', 'Politic'];
const { width } = Dimensions.get('window');

export default function SearchScreen() {
  const [activeCategory, setActiveCategory] = useState('Top');
  const router = useRouter();

  // Mock chart data - in real app, use a charting library like react-native-chart-kit
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    x: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'][i % 12],
    y: 50 + Math.sin(i) * 10,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <SearchBar placeholder="Q Search events" />
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

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
              <Text style={styles.headerText}>1 month to close</Text>
            </View>
            <View style={styles.headerRight}>
              <Ionicons
                name="eye-outline"
                size={16}
                color={DesignColors.light.white}
              />
              <Text style={styles.headerText}>200k vol.</Text>
            </View>
          </View>

          {/* Question */}
          <View style={styles.questionRow}>
            <View style={styles.bitcoinIcon}>
              <Text style={styles.bitcoinSymbol}>₿</Text>
            </View>
            <Text style={styles.question}>
              What price will Bitcoin hit in November?
            </Text>
          </View>

          {/* Prediction */}
          <View style={styles.predictionRow}>
            <Text style={styles.predictionText}>Yes</Text>
            <Ionicons
              name="refresh"
              size={16}
              color={DesignColors.chart.line}
            />
            <Text style={styles.chanceText}>46% chance</Text>
          </View>

          {/* Chart Placeholder */}
          <View style={styles.chartContainer}>
            <View style={styles.chartYAxis}>
              <Text style={styles.chartYLabel}>75%</Text>
              <Text style={styles.chartYLabel}>50%</Text>
              <Text style={styles.chartYLabel}>25%</Text>
              <Text style={styles.chartYLabel}>0%</Text>
            </View>
            <View style={styles.chartArea}>
              {/* Simplified chart representation */}
              <View style={styles.chartLine} />
              <View style={styles.chartFill} />
              <View style={styles.chartXAxis}>
                {chartData.slice(-5).map((point, index) => (
                  <Text key={index} style={styles.chartXLabel}>
                    {point.x}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Profit Info */}
          <View style={styles.profitContainer}>
            <Text style={styles.profitText}>
              Yes Potential profit +10%
            </Text>
            <Text style={styles.profitSeparator}>|</Text>
            <Text style={styles.profitText}>No Potential profit +15%</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Yes"
              onPress={() => router.push('/buy')}
              variant="primary"
              size="lg"
              style={styles.actionButton}
              rightIcon={
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>5</Text>
                </View>
              }
            />
            <Button
              title="No"
              onPress={() => router.push('/buy')}
              variant="secondary"
              size="lg"
              style={styles.actionButton}
              rightIcon={
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>4</Text>
                </View>
              }
            />
          </View>
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
    paddingBottom: 20,
  },
  predictionCard: {
    marginHorizontal: Spacing.md,
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
    marginBottom: Spacing.lg,
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
  chartContainer: {
    flexDirection: 'row',
    height: 150,
    marginBottom: Spacing.md,
  },
  chartYAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingRight: Spacing.sm,
  },
  chartYLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.caption.sm.fontSize,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  chartLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: DesignColors.dark.muted,
  },
  chartFill: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: DesignColors.chart.fill,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  chartXAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.xs,
  },
  chartXLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.caption.sm.fontSize,
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  profitText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
  },
  profitSeparator: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  priceBadge: {
    backgroundColor: DesignColors.yellow.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  priceBadgeText: {
    color: DesignColors.dark.primary,
    fontSize: Typography.caption.md.fontSize,
    fontWeight: '700',
  },
});

