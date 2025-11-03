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

export default function GoodLuckScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        {/* Illustration placeholder */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustration}>
            <Text style={styles.illustrationText}>🎮</Text>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Good luck on your next move!</Text>
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
    color: DesignColors.yellow.primary,
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    marginBottom: Spacing.lg,
  },
});

