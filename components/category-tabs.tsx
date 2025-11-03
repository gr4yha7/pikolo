import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity
} from 'react-native';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {categories.map((category) => {
        const isActive = category === activeCategory;
        return (
          <TouchableOpacity
            key={category}
            style={[
              styles.tab,
              isActive && styles.activeTab,
              !isActive && styles.inactiveTab,
            ]}
            onPress={() => onCategoryChange(category)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.tabText,
                isActive && styles.activeTabText,
                !isActive && styles.inactiveTabText,
              ]}>
              {category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  activeTab: {
    backgroundColor: DesignColors.light.white,
  },
  inactiveTab: {
    backgroundColor: DesignColors.dark.secondary,
  },
  tabText: {
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  activeTabText: {
    color: DesignColors.dark.primary,
  },
  inactiveTabText: {
    color: DesignColors.light.white,
  },
});

