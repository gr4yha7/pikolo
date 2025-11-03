import { DesignColors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface BottomNavProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const tabs = [
  { id: 'home', icon: 'flash' as const },
  { id: 'chart', icon: 'trending-up' as const },
  { id: 'wallet', icon: 'wallet' as const },
  { id: 'profile', icon: 'people' as const },
  { id: 'more', icon: 'ellipsis-horizontal' as const },
];

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabPress(tab.id)}
          activeOpacity={0.7}>
          <Ionicons
            name={tab.icon}
            size={24}
            color={
              activeTab === tab.id
                ? DesignColors.yellow.primary
                : DesignColors.light.white
            }
          />
          {activeTab === tab.id && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: DesignColors.dark.secondary,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DesignColors.yellow.primary,
  },
});

