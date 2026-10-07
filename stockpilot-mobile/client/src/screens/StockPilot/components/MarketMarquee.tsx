import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  children: ReactNode;
};

export function MarketMarquee({children}: Props) {
  const focused = useIsFocused();
  const translateX = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const [rowWidth, setRowWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState(true);
  const [screenReader, setScreenReader] = useState(true);

  useEffect(() => {
    let active = true;
    let motionChanged = false;
    let readerChanged = false;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active && !motionChanged) {
          setReduceMotion(value);
        }
      })
      .catch(() => undefined);

    void AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (active && !readerChanged) {
          setScreenReader(value);
        }
      })
      .catch(() => undefined);

    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      motionChanged = true;
      setReduceMotion(value);
    });

    const reader = AccessibilityInfo.addEventListener('screenReaderChanged', (value) => {
      readerChanged = true;
      setScreenReader(value);
    });

    const app = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      setPaused(false);
    });

    return () => {
      active = false;
      motion.remove();
      reader.remove();
      app.remove();
    };
  }, []);

  useEffect(() => {
    position.current = 0;
    translateX.setValue(0);
  }, [rowWidth, translateX]);

  const manual = reduceMotion || screenReader;

  useEffect(() => {
    if (!focused || !appActive || paused || manual || rowWidth <= 0) {
      return;
    }

    let active = true;

    const animate = () => {
      const remaining = Math.max(0, rowWidth + position.current);

      Animated.timing(translateX, {
        toValue: -rowWidth,
        duration: Math.max(1, (remaining / 24) * 1000),
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }).start(({finished}) => {
        if (!active || !finished) {
          return;
        }

        position.current = 0;
        translateX.setValue(0);
        animate();
      });
    };

    animate();

    return () => {
      active = false;

      translateX.stopAnimation((value) => {
        position.current = value;
      });
    };
  }, [focused, appActive, paused, manual, rowWidth, translateX]);

  if (manual) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={styles.viewport}
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
    >
      <Animated.View style={[styles.track, {transform: [{translateX}]}]}>
        <View
          style={[styles.content, {minWidth: viewportWidth}]}
          onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
        >
          {children}
        </View>

        <View
          style={[styles.content, {minWidth: viewportWidth}]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
  },

  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },

  content: {
    flexDirection: 'row',
    flexShrink: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});
