import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DesignColors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const rewards = [
  {
    id: '1',
    question: 'Will Donald Trump win the 2024 election?',
    amount: 145.0,
    image: require('@/assets/images/icon.png'),
  },
  {
    id: '2',
    question: 'What price will Bitcoin hit in November?',
    amount: 605.0,
    image: require('@/assets/images/icon.png'),
  },
];

export default function ClaimRewardsScreen() {
  const router = useRouter();
  const totalAmount = rewards.reduce((sum, r) => sum + r.amount, 0);

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        {/* Modal Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Claim Rewards</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              Claim all eligible positions for
            </Text>
            <View style={styles.summaryAmount}>
              <Ionicons name="diamond" size={24} color={DesignColors.yellow.primary} />
              <Text style={styles.summaryAmountText}>
                {totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Reward Items */}
          <View style={styles.rewardsContainer}>
            {rewards.map((reward) => (
              <Card key={reward.id} variant="elevated" style={styles.rewardCard}>
                <View style={styles.rewardContent}>
                  <View style={styles.rewardImage}>
                    <Ionicons name="diamond" size={24} color={DesignColors.yellow.primary} />
                  </View>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardQuestion}>{reward.question}</Text>
                    <Text style={styles.rewardAmount}>
                      {reward.amount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Confirm"
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.dark.primary,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: DesignColors.dark.muted,
    borderRadius: 2,
  },
  header: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  headerTitle: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.lg.fontSize,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 20,
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  summaryText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  summaryAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryAmountText: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.xl.fontSize,
    fontWeight: 'bold',
  },
  rewardsContainer: {
    gap: Spacing.md,
  },
  rewardCard: {
    marginBottom: Spacing.sm,
  },
  rewardContent: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rewardImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DesignColors.dark.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardQuestion: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  rewardAmount: {
    color: DesignColors.light.white,
    fontSize: Typography.heading.sm.fontSize,
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: DesignColors.dark.muted,
  },
  button: {
    width: '100%',
  },
});

