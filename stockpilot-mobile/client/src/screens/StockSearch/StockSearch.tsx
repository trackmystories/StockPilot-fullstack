import { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../..';
import { StockSearchSection } from '../StockPilot/components/StockSearchSection';
import type { SelectStock } from '../StockPilot/types/stockPilot';
import { RecentSearchesSection } from './components/RecentSearchesSection';
import { useRecentSearches } from './hooks/useRecentSearches';

type Props = NativeStackScreenProps<
  HomeStackParamList,
  'StockSearch'
>;

export default function StockSearch({
  navigation,
}: Props) {
  const { height } = useWindowDimensions();

  const translateY = useRef(
    new Animated.Value(-height),
  ).current;

  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentSearches();

  useEffect(() => {
    let active = true;

    const open = async () => {
      const reduceMotion =
        await AccessibilityInfo.isReduceMotionEnabled().catch(
          () => true,
        );

      if (!active) {
        return;
      }

      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    void open();

    return () => {
      active = false;
      translateY.stopAnimation();
    };
  }, [translateY]);

  const openStock = useCallback(
    (stock: SelectStock) => {
      Keyboard.dismiss();

      void addRecentSearch(stock);

      navigation.navigate('StockPilotScoreCard', {
        stock,
      });
    },
    [addRecentSearch, navigation],
  );

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  return (
    <Animated.View
      style={[
        styles.screen,
        {
          transform: [{ translateY }],
        },
      ]}
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.body}
          behavior={
            Platform.OS === 'ios' ? 'padding' : undefined
          }
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <StockSearchSection
              onBack={handleBack}
              onStockPress={openStock}
              onFilterPress={() => {
                Keyboard.dismiss();
                navigation.navigate('StockFilter');
              }}
            />

            {recentSearches.length > 0 ? (
              <RecentSearchesSection
                stocks={recentSearches}
                onPress={openStock}
                onRemove={(symbol) => {
                  void removeRecentSearch(symbol);
                }}
                onClear={() => {
                  void clearRecentSearches();
                }}
              />
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});