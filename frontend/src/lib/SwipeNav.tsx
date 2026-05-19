import React from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const THRESHOLD = 50;

export function SwipeNav({
  onPrev,
  onNext,
  children,
}: {
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
}) {
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-25, 25])
    .onEnd((e) => {
      'worklet';
      if (e.translationX > THRESHOLD) runOnJS(onPrev)();
      else if (e.translationX < -THRESHOLD) runOnJS(onNext)();
    });
  return <GestureDetector gesture={pan}>{children as any}</GestureDetector>;
}
