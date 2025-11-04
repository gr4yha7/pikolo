import { Button } from '@/components/ui/button';
import { DesignColors, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/use-wallet';
import { setOnboardingCompleted } from '@/utils/onboarding';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';

const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to Pikolo',
    subtitle: 'Bitcoin-Backed Predictions',
    description:
      'Transform idle BTC into leveraged bets on predictions without selling assets. Borrow MUSD at 1% fixed rates.',
    illustration: '🎯',
  },
  {
    id: 2,
    title: 'Make Predictions',
    subtitle: 'Bet on What Matters',
    description:
      'Predict the outcome of events ranging from crypto prices to world events. Your predictions, your rewards.',
    illustration: '📊',
  },
  {
    id: 3,
    title: 'Earn Rewards',
    subtitle: 'Get Paid for Being Right',
    description:
      'Win MUSD when your predictions are correct. Track your performance and climb the leaderboard.',
    illustration: '💰',
  },
  {
    id: 4,
    title: 'Ready to Start?',
    subtitle: 'Connect Your BTC Wallet',
    description:
      'Connect your Bitcoin wallet to deposit collateral and mint MUSD. You maintain full BTC exposure while trading.',
    illustration: '🚀',
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { wallet, connectWallet } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = async () => {
    if (isLastStep) {
      // Connect wallet on last step
      if (!wallet.isConnected) {
        try {
          setIsConnecting(true);
          await connectWallet('evm'); // Connect EVM wallet (Mezo uses EVM-compatible chain)
          
          // Mark onboarding as completed after successful wallet connection
          await setOnboardingCompleted();
          
          // After successful connection, navigate to home
          router.replace('/(tabs)');
        } catch (error) {
          console.error('Error connecting wallet:', error);
          // Stay on onboarding if connection fails - user can try again
        } finally {
          setIsConnecting(false);
        }
      } else {
        // Wallet already connected, just mark onboarding as completed
        await setOnboardingCompleted();
        router.replace('/(tabs)');
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = async () => {
    // Allow skipping onboarding - user can connect wallet later from the app
    await setOnboardingCompleted();
    router.replace('/(tabs)');
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <SafeArea style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Skip Button */}
        {!isLastStep && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustration}>{step.illustration}</Text>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>
          <Text style={styles.description}>{step.description}</Text>
        </View>

        {/* Step Indicators */}
        <View style={styles.indicatorsContainer}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 0 && (
            <Button
              title="Previous"
              onPress={handlePrevious}
              variant="outline"
              size="lg"
              style={styles.previousButton}
            />
          )}
          <Button
            title={
              isConnecting
                ? 'Connecting...'
                : isLastStep
                  ? 'Get Started'
                  : 'Next'
            }
            onPress={handleNext}
            variant="primary"
            size="lg"
            style={currentStep === 0 ? { ...styles.nextButton, ...styles.fullWidth } : styles.nextButton}
            disabled={isConnecting}
            rightIcon={
              isConnecting ? (
                <ActivityIndicator size="small" color={DesignColors.dark.primary} />
              ) : undefined
            }
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.dark.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: Spacing.sm,
  },
  skipText: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  illustration: {
    fontSize: 120,
  },
  contentContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  title: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: DesignColors.yellow.primary,
    fontSize: Typography.heading.md.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.lg.fontSize,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xl,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DesignColors.dark.muted,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: DesignColors.yellow.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  previousButton: {
    flex: 1,
  },
  nextButton: {
    flex: 1,
  },
  fullWidth: {
    flex: 1,
    width: '100%',
  },
});

