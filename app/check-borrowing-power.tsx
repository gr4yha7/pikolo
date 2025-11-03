/**
 * Check Borrowing Power Screen
 * 
 * Standalone screen for checking borrowing power
 */

import { AppHeader } from '@/components/app-header';
import { BorrowingPowerChecker } from '@/components/borrowing-power-checker';
import { DesignColors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CheckBorrowingPowerScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/borrow' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Borrowing Power" showClose={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <BorrowingPowerChecker onGetStarted={handleGetStarted} />
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
    paddingBottom: Spacing.xl,
  },
});

