import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const timeRanges = ['Weekly', 'Monthly', 'All-time'];

const mockLeaderboard = [
  { rank: 1, name: 'Hung Dinh', value: 962242.5 },
  { rank: 2, name: 'Hung Dinh', value: 962242.5 },
  { rank: 3, name: 'Hung Dinh', value: 962242.5 },
  { rank: 4, name: 'Hung Dinh', value: 962242.5 },
  { rank: 5, name: 'Hung Dinh', value: 962242.5 },
  { rank: 6, name: 'Hung Dinh', value: 962242.5 },
  { rank: 7, name: 'Hung Dinh', value: 962242.5 },
  { rank: 8, name: 'Hung Dinh', value: 962242.5 },
  { rank: 30, name: 'Me', value: 6242.5, isCurrentUser: true },
];

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

export default function LeaderboardScreen() {
  const [activeRange, setActiveRange] = useState('Weekly');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'earn' | 'referral'>('leaderboard');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Leaderboard" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Main Tabs */}
        <View style={styles.mainTabsContainer}>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'leaderboard' && styles.activeMainTab]}
            onPress={() => setActiveTab('leaderboard')}>
            <Text
              style={[
                styles.mainTabText,
                activeTab === 'leaderboard' && styles.activeMainTabText,
              ]}>
              Leaderboard
            </Text>
            {activeTab === 'leaderboard' && <View style={styles.mainTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'earn' && styles.activeMainTab]}
            onPress={() => setActiveTab('earn')}>
            <Text
              style={[
                styles.mainTabText,
                activeTab === 'earn' && styles.activeMainTabText,
              ]}>
              Earn
            </Text>
            {activeTab === 'earn' && <View style={styles.mainTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'referral' && styles.activeMainTab]}
            onPress={() => setActiveTab('referral')}>
            <Text
              style={[
                styles.mainTabText,
                activeTab === 'referral' && styles.activeMainTabText,
              ]}>
              Referral
            </Text>
            {activeTab === 'referral' && <View style={styles.mainTabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <>
            {/* Time Range Tabs */}
            <View style={styles.tabsContainer}>
              {timeRanges.map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.tab,
                    activeRange === range && styles.activeTab,
                  ]}
                  onPress={() => setActiveRange(range)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.tabText,
                      activeRange === range && styles.activeTabText,
                    ]}>
                    {range}
                  </Text>
                  {activeRange === range && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Leaderboard List */}
            <View style={styles.leaderboardContainer}>
              {mockLeaderboard.map((item, index) => (
                <View
                  key={item.rank}
                  style={[
                    styles.leaderboardItem,
                    item.isCurrentUser && styles.currentUserItem,
                    index === 0 && styles.firstItem,
                  ]}>
                  <View style={styles.rankContainer}>
                    <Text
                      style={[
                        styles.rankText,
                        item.isCurrentUser && styles.currentUserRankText,
                      ]}>
                      {item.rank}
                    </Text>
                  </View>
                  <View style={styles.nameContainer}>
                    <Text
                      style={[
                        styles.nameText,
                        item.isCurrentUser && styles.currentUserNameText,
                      ]}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={styles.valueContainer}>
                    <Ionicons
                      name="diamond"
                      size={16}
                      color={
                        item.isCurrentUser
                          ? DesignColors.yellow.primary
                          : DesignColors.yellow.primary
                      }
                    />
                    <Text
                      style={[
                        styles.valueText,
                        item.isCurrentUser && styles.currentUserValueText,
                      ]}>
                      {item.value.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Earn Tab */}
        {activeTab === 'earn' && (
          <View>
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
          </View>
        )}

        {/* Referral Tab */}
        {activeTab === 'referral' && (
          <View style={styles.referralContainer}>
            <Card variant="elevated" style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <Ionicons name="people" size={48} color={DesignColors.yellow.primary} />
                <Text style={styles.referralTitle}>Invite Friends</Text>
                <Text style={styles.referralSubtitle}>
                  Share your referral code and earn rewards
                </Text>
              </View>
              <View style={styles.referralCodeContainer}>
                <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
                <View style={styles.referralCodeBox}>
                  <Text style={styles.referralCode}>ABC123XYZ</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Ionicons name="copy-outline" size={20} color={DesignColors.yellow.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.referralStats}>
                <View style={styles.referralStatItem}>
                  <Text style={styles.referralStatValue}>0</Text>
                  <Text style={styles.referralStatLabel}>Referrals</Text>
                </View>
                <View style={styles.referralStatDivider} />
                <View style={styles.referralStatItem}>
                  <Text style={styles.referralStatValue}>0</Text>
                  <Text style={styles.referralStatLabel}>Rewards Earned</Text>
                </View>
              </View>
            </Card>
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
  mainTabsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignColors.dark.muted,
  },
  mainTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  activeMainTab: {
    borderBottomWidth: 2,
    borderBottomColor: DesignColors.light.white,
  },
  mainTabText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
  },
  activeMainTabText: {
    color: DesignColors.light.white,
    fontWeight: '600',
  },
  mainTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: DesignColors.light.white,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
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
  leaderboardContainer: {
    gap: Spacing.sm,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: DesignColors.dark.card,
    borderRadius: Radius.md,
  },
  firstItem: {
    backgroundColor: DesignColors.purple.primary,
  },
  currentUserItem: {
    backgroundColor: DesignColors.dark.secondary,
    borderWidth: 2,
    borderColor: DesignColors.yellow.primary,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  currentUserRankText: {
    color: DesignColors.yellow.primary,
  },
  nameContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nameText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
  },
  currentUserNameText: {
    color: DesignColors.yellow.primary,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  currentUserValueText: {
    color: DesignColors.yellow.primary,
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
  referralContainer: {
    marginTop: Spacing.md,
  },
  referralCard: {
    padding: Spacing.lg,
  },
  referralHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  referralTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  referralSubtitle: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    textAlign: 'center',
  },
  referralCodeContainer: {
    marginBottom: Spacing.lg,
  },
  referralCodeLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
    marginBottom: Spacing.sm,
  },
  referralCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DesignColors.dark.secondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.dark.muted,
  },
  referralCode: {
    color: DesignColors.light.white,
    fontSize: Typography.body.lg.fontSize,
    fontWeight: '600',
    letterSpacing: 2,
  },
  copyButton: {
    padding: Spacing.xs,
  },
  referralStats: {
    flexDirection: 'row',
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  referralStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  referralStatValue: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  referralStatLabel: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  referralStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: DesignColors.dark.muted,
  },
});

