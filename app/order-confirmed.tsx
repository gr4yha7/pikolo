import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrderConfirmedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader title="Pikolo" showClose={true} />
      <View style={styles.content}>
        {/* Question */}
        <Text style={styles.question}>
          What price will Bitcoin hit in November?
        </Text>

        {/* Illustration placeholder - would use actual illustration in production */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustration}>
            <Text style={styles.illustrationText}>🎁</Text>
          </View>
        </View>

        {/* Confirmation Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Order submitted</Text>
          <Text style={styles.subtitle}>Your bet is confirmed!</Text>
          <Text style={styles.description}>
            Time to track your prediction.
          </Text>
        </View>

        {/* Action Button */}
        <Button
          title="Done"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          variant="primary"
          size="lg"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.dark.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  question: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: Radius.xl,
    backgroundColor: DesignColors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationText: {
    fontSize: 80,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: DesignColors.light.white,
    fontSize: Typography.body.lg.fontSize,
    marginBottom: Spacing.xs,
  },
  description: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
  },
  button: {
    marginBottom: Spacing.lg,
  },
});

