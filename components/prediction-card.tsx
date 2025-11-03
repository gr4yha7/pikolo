import { DesignColors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card } from './ui/card';

interface PredictionCardProps {
  id?: string;
  image?: string | number;
  question: string;
  prediction?: 'Yes' | 'No';
  chance?: number;
  timeToClose: string;
  volume: string;
  yesProfit?: string;
  noProfit?: string;
  yesPrice?: number;
  noPrice?: number;
  onYesPress?: () => void;
  onNoPress?: () => void;
  onSharePress?: () => void;
  onPress?: () => void;
}

export function PredictionCard({
  id,
  image,
  question,
  prediction,
  chance,
  timeToClose,
  volume,
  yesProfit,
  noProfit,
  yesPrice,
  noPrice,
  onYesPress,
  onNoPress,
  onSharePress,
  onPress,
}: PredictionCardProps) {
  const router = useRouter();

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else if (id) {
      router.push(`/prediction/${id}`);
    }
  };

  const handleButtonPress = (handler?: () => void) => {
    return () => {
      handler?.();
      // Don't navigate to detail when button is pressed
    };
  };

  return (
    <TouchableOpacity 
      onPress={handleCardPress}
      activeOpacity={0.8}>
      <Card variant="elevated" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="time-outline"
            size={16}
            color={DesignColors.light.white}
          />
          <Text style={styles.headerText}>{timeToClose}</Text>
        </View>
        <View style={styles.headerCenter}>
          <Ionicons
            name="volume-high-outline"
            size={16}
            color={DesignColors.light.white}
          />
          <Text style={styles.headerText}>{volume}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleButtonPress(onSharePress)} 
          activeOpacity={0.7}>
          <Ionicons
            name="share-outline"
            size={20}
            color={DesignColors.light.white}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {image && (
          <Image
            source={typeof image === 'string' ? { uri: image } : image}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        <View style={styles.questionContainer}>
          <Text style={styles.question}>{question}</Text>
          {prediction && (
            <View style={styles.predictionContainer}>
              <Text style={styles.prediction}>{prediction}</Text>
              <Ionicons
                name="refresh"
                size={16}
                color={DesignColors.dark.muted}
              />
              <Text style={styles.chance}>{chance}% chance</Text>
            </View>
          )}
        </View>
      </View>

      {/* Profit Info */}
      {(yesProfit || noProfit) && (
        <View style={styles.profitContainer}>
          {yesProfit && (
            <Text style={styles.profitText}>
              Yes Potential profit {yesProfit}
            </Text>
          )}
          {yesProfit && noProfit && (
            <Text style={styles.profitSeparator}>|</Text>
          )}
          {noProfit && (
            <Text style={styles.profitText}>
              No Potential profit {noProfit}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.yesButton]}
          onPress={handleButtonPress(onYesPress)}
          activeOpacity={0.8}>
          <Text style={styles.actionButtonText}>Yes</Text>
          <View style={styles.priceBadge}>
            <Ionicons
              name="diamond"
              size={12}
              color={DesignColors.dark.primary}
            />
            <Text style={styles.priceText}>{yesPrice || '5'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.noButton]}
          onPress={handleButtonPress(onNoPress)}
          activeOpacity={0.8}>
          <Text style={styles.actionButtonText}>No</Text>
          <View style={styles.priceBadge}>
            <Ionicons
              name="diamond"
              size={12}
              color={DesignColors.dark.primary}
            />
            <Text style={styles.priceText}>{noPrice || '4'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    color: DesignColors.light.white,
    fontSize: Typography.caption.md.fontSize,
  },
  content: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: DesignColors.dark.secondary,
  },
  questionContainer: {
    flex: 1,
  },
  question: {
    color: DesignColors.light.white,
    fontSize: Typography.body.lg.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  predictionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prediction: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
    fontWeight: '500',
  },
  chance: {
    color: DesignColors.dark.muted,
    fontSize: Typography.caption.md.fontSize,
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  profitText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.sm.fontSize,
  },
  profitSeparator: {
    color: DesignColors.dark.muted,
    fontSize: Typography.body.sm.fontSize,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  yesButton: {
    backgroundColor: DesignColors.purple.primary,
  },
  noButton: {
    backgroundColor: DesignColors.purple.primary,
  },
  actionButtonText: {
    color: DesignColors.light.white,
    fontSize: Typography.body.md.fontSize,
    fontWeight: '600',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignColors.yellow.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  priceText: {
    color: DesignColors.dark.primary,
    fontSize: Typography.caption.md.fontSize,
    fontWeight: '700',
  },
});

