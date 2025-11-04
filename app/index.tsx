/**
 * Root index route - handles initial navigation
 * Redirects to onboarding if not completed, otherwise to tabs
 */

import { DesignColors } from '@/constants/theme';
import { hasCompletedOnboarding } from '@/utils/onboarding';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await hasCompletedOnboarding();
        
        // Wait a bit for navigation to be ready
        setTimeout(() => {
          if (!completed) {
            // Navigate to onboarding if not completed
            router.replace('/onboarding');
          } else {
            // Navigate to tabs if onboarding is completed
            // router.replace('/onboarding');
            router.replace('/(tabs)');
          }
          setIsChecking(false);
        }, 100);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to onboarding on error
        router.replace('/onboarding');
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [router]);

  // Show loading screen while checking
  if (isChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DesignColors.yellow.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.dark.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

