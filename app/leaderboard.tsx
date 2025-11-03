import { AppHeader } from '@/components/app-header';
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

export default function LeaderboardScreen() {
  const [activeRange, setActiveRange] = useState('Weekly');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Leaderboard" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
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
});

