import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSearchPress?: () => void;
  rightAction?: React.ReactNode;
}

export function SearchBar({
  placeholder = 'Bitcoin',
  value,
  onChangeText,
  onSearchPress,
  rightAction,
}: SearchBarProps) {
  const [searchText, setSearchText] = useState(value || '');

  const handleChangeText = (text: string) => {
    setSearchText(text);
    onChangeText?.(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchInput}>
        <Ionicons
          name="search"
          size={20}
          color={DesignColors.dark.muted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={DesignColors.dark.muted}
          value={searchText}
          onChangeText={handleChangeText}
        />
      </View>
      {rightAction || (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSearchPress}
          activeOpacity={0.8}>
          <Text style={styles.actionButtonText}>
            <Ionicons name="search" size={20} color={DesignColors.light.white} />
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignColors.dark.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
  },
  actionButton: {
    width: 44,
    height: 44,
    backgroundColor: DesignColors.purple.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
  },
});

