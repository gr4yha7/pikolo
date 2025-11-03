import { DesignColors } from '@/constants/theme';
import React, { useState } from 'react';
import {
    GestureResponderEvent,
    PanResponder,
    StyleSheet,
    View,
} from 'react-native';

interface SliderProps {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

export function Slider({
  value,
  minimumValue = 0,
  maximumValue = 100,
  onValueChange,
  minimumTrackTintColor = DesignColors.yellow.primary,
  maximumTrackTintColor = DesignColors.light.white,
  thumbTintColor = DesignColors.yellow.primary,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

  const handleTouch = (evt: GestureResponderEvent) => {
    if (width === 0) return;
    const x = evt.nativeEvent.locationX;
    const newPercentage = Math.max(0, Math.min(100, (x / width) * 100));
    const newValue =
      minimumValue + (newPercentage / 100) * (maximumValue - minimumValue);
    onValueChange(newValue);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: handleTouch,
    onPanResponderMove: handleTouch,
  });

  return (
    <View
      style={[styles.track, { backgroundColor: maximumTrackTintColor }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}>
      <View
        style={[
          styles.fill,
          { width: `${percentage}%`, backgroundColor: minimumTrackTintColor },
        ]}
      />
      <View
        style={[
          styles.thumb,
          { left: `${percentage}%`, backgroundColor: thumbTintColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: DesignColors.dark.primary,
  },
});

