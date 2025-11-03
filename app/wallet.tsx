import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Using View with gradient colors - would use expo-linear-gradient if installed

export default function WalletScreen() {
  const [activeSection, setActiveSection] = useState<'earn' | 'referral'>('earn');
  const router = useRouter();
  const balance = 6242.50;
  const inPositions = 1320.00;
  const changePercent = 3;
  const changeAmount = 39.60;

  const tasks = [
    {
      id: '1',
      icon: 'paper-plane' as const,
      title: 'Follow Telegram',
      points: 100,
      status: 'claim' as const,
    },
    {
      id: '2',
      icon: 'logo-twitter' as const,
      title: 'Check Pikolo X',
      points: 100,
      status: 'start' as const,
    },
    {
      id: '3',
      icon: 'logo-facebook' as const,
      title: 'Check Pikolo Facebook',
      points: 100,
      status: 'completed' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Wallet" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Wallet Header Card with Gradient */}
        <View style={[styles.walletCard, styles.gradient]}>
          <View style={styles.gradientInner}>
            <View style={styles.walletHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color={DesignColors.light.white} />
                </View>
                <Text style={styles.greeting}>Hi, Dreadfulz</Text>
              </View>
            </View>
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Total balance</Text>
              <Text style={styles.balanceValue}>{balance.toLocaleString()}</Text>
            </View>
            <View style={styles.walletIdContainer}>
              <Ionicons name="diamond" size={12} color={DesignColors.yellow.primary} />
              <Text style={styles.walletId}>UQBnz...01-B</Text>
              <Ionicons name="chevron-down" size={12} color={DesignColors.light.white} />
            </View>
            <Button
              title="Top up Pikolo coins"
              onPress={() => {}}
              variant="primary"
              size="md"
              leftIcon={<Ionicons name="add" size={20} color={DesignColors.dark.primary} />}
              style={styles.topUpButton}
            />
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>In positions</Text>
            <Text style={styles.metricValue}>{inPositions.toLocaleString()}</Text>
            <View style={styles.metricChange}>
              <Text style={[styles.metricChangeText, { color: DesignColors.success }]}>
                +{changePercent}% ({changeAmount})
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'earn' && styles.activeTab]}
            onPress={() => setActiveSection('earn')}>
            <Text
              style={[
                styles.tabText,
                activeSection === 'earn' && styles.activeTabText,
              ]}>
              Earn
            </Text>
            {activeSection === 'earn' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'referral' && styles.activeTab]}
            onPress={() => setActiveSection('referral')}>
            <Text
              style={[
                styles.tabText,
                activeSection === 'referral' && styles.activeTabText,
              ]}>
              Referral
            </Text>
            {activeSection === 'referral' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Daily Check-in */}
        <Card variant="elevated" style={styles.checkInCard}>
          <View style={styles.checkInContent}>
            <Ionicons name="laptop-outline" size={32} color={DesignColors.yellow.primary} />
            <View style={styles.checkInText}>
              <Text style={styles.checkInTitle}>1-day check-in</Text>
              <Text style={styles.checkInSubtitle}>Next claim in 08h 11m</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={DesignColors.yellow.primary} />
          </View>
        </Card>

        {/* Tasks */}
        <View style={styles.tasksContainer}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          {tasks.map((task) => (
            <Card key={task.id} variant="elevated" style={styles.taskCard}>
              <View style={styles.taskContent}>
                <View style={styles.taskIconContainer}>
                  <Ionicons
                    name={task.icon}
                    size={24}
                    color={DesignColors.light.white}
                  />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskPoints}>+ {task.points}</Text>
                </View>
                {task.status === 'claim' && (
                  <Button
                    title="Claim"
                    onPress={() => {}}
                    variant="primary"
                    size="sm"
                  />
                )}
                {task.status === 'start' && (
                  <Button
                    title="Start"
                    onPress={() => {}}
                    variant="outline"
                    size="sm"
                  />
                )}
                {task.status === 'completed' && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={DesignColors.yellow.primary}
                  />
                )}
              </View>
            </Card>
          ))}
        </View>
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
  walletCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  gradient: {
    backgroundColor: DesignColors.purple.primary,
  },
  gradientInner: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  walletHeader: {
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: DesignColors.light.white,
    fontSize: Typography.body.lg.fontSize,
    fontWeight: '500',
  },
  balanceSection: {
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    color: DesignColors.light.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  walletIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  walletId: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
  },
  topUpButton: {
    marginTop: Spacing.sm,
  },
  metricsContainer: {
    marginBottom: Spacing.md,
  },
  metricItem: {
    backgroundColor: DesignColors.dark.card,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  metricLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.lg.fontSize,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  metricChange: {
    flexDirection: 'row',
  },
  metricChangeText: {
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.dark.muted,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: DesignColors.light.white,
  },
  tabText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
  },
  activeTabText: {
    color: DesignColors.light.white,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: DesignColors.light.white,
  },
  checkInCard: {
    marginBottom: Spacing.md,
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkInText: {
    flex: 1,
  },
  checkInTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  checkInSubtitle: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  tasksContainer: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  taskCard: {
    marginBottom: Spacing.sm,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DesignColors.dark.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  taskPoints: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
});

