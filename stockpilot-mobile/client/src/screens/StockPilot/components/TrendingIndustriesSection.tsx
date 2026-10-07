import {useCallback, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type {StockFilterRoutes} from '../../StockFilter/domain/stockFilter';
import {stockFilterRepository} from '../../StockFilter/infrastructure/HttpStockFilterRepository';
import {
  getTrendingIndustryParams,
  getTrendingIndustryScrollIndex,
  TRENDING_INDUSTRIES,
  type TrendingIndustryShortcut,
} from '../domain/trendingIndustryShortcuts';
type Props = {
  onOpenResults: (params: StockFilterRoutes['StockFilterList']) => void;
  onViewAllPress: () => void;
};
type IndustryError = {
  industry: TrendingIndustryShortcut;
  message: string;
};
export function TrendingIndustriesSection({onOpenResults, onViewAllPress}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, setPending] = useState<TrendingIndustryShortcut | null>(null);
  const [error, setError] = useState<IndustryError | null>(null);
  const request = useRef<AbortController | null>(null);
  useFocusEffect(
    useCallback(() => {
      setPending(null);
      return () => {
        request.current?.abort();
        request.current = null;
      };
    }, []),
  );
  const openIndustry = async (industry: TrendingIndustryShortcut) => {
    // A newer tap replaces the pending request; leaving the screen cancels it.
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setActiveIndex(TRENDING_INDUSTRIES.findIndex((item) => item.key === industry.key));
    setPending(industry);
    setError(null);
    try {
      const options = await stockFilterRepository.options(controller.signal);
      if (controller.signal.aborted || request.current !== controller) {
        return;
      }
      const params = getTrendingIndustryParams(options, industry.key);
      setPending(null);
      onOpenResults(params);
    } catch (cause: unknown) {
      if (!controller.signal.aborted && request.current === controller) {
        setError({
          industry,
          message: cause instanceof Error ? cause.message : 'Could not open this industry.',
        });
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(null);
      }
    }
  };
  const openAllFilters = () => {
    request.current?.abort();
    request.current = null;
    setPending(null);
    setError(null);
    onViewAllPress();
  };
  const handleScroll = ({nativeEvent}: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {contentOffset, contentSize, layoutMeasurement} = nativeEvent;
    if (contentSize.width <= layoutMeasurement.width) {
      return;
    }
    setActiveIndex(
      getTrendingIndustryScrollIndex(
        contentOffset.x,
        contentSize.width,
        layoutMeasurement.width,
        TRENDING_INDUSTRIES.length,
      ),
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore industries</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.viewAllButton}
          onPress={openAllFilters}
          accessibilityRole="button"
          accessibilityLabel="View all stock filters"
        >
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="arrow-forward" size={20} color="#079B73" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Tap an industry to explore its stocks.</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cards}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {TRENDING_INDUSTRIES.map((industry, index) => {
          const active = index === activeIndex;
          const loading = pending?.key === industry.key;
          return (
            <TouchableOpacity
              key={industry.key}
              activeOpacity={0.75}
              style={[styles.card, industry.inline && styles.inlineCard, active && styles.activeCard]}
              onPress={() => void openIndustry(industry)}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${industry.label} stocks`}
              accessibilityState={{selected: active, busy: loading}}
            >
              <View style={styles.icon}>
                {loading ? (
                  <ActivityIndicator size="small" color="#079B73" />
                ) : (
                  <Ionicons
                    name={industry.icon}
                    size={24}
                    color={active ? '#079B73' : '#081B3A'}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.cardLabel,
                  industry.inline && styles.inlineLabel,
                  active && styles.activeLabel,
                ]}
              >
                {industry.displayLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.dots} pointerEvents="none" accessible={false}>
        {TRENDING_INDUSTRIES.map((industry, index) => (
          <View key={industry.key} style={[styles.dot, index === activeIndex && styles.activeDot]} />
        ))}
      </View>
      {pending ? (
        <Text style={styles.statusText} accessibilityLiveRegion="polite">
          Opening {pending.label}…
        </Text>
      ) : null}
      {error ? (
        <View style={styles.errorContainer} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => void openIndustry(error.industry)}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel={`Retry opening ${error.industry.label}`}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    lineHeight: 23,
    color: '#081B3A',
  },
  viewAllButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  viewAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#079B73',
  },
  subtitle: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#7788A3',
  },
  cards: {
    alignItems: 'stretch',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 1,
  },
  card: {
    width: 148,
    minHeight: 86,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#DDE7ED',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#081B3A',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  inlineCard: {
    flexDirection: 'row',
    gap: 9,
  },
  activeCard: {
    borderColor: '#7BDCB9',
    backgroundColor: '#E8F8F2',
    shadowColor: '#079B73',
    shadowOpacity: 0.08,
  },
  icon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: '#081B3A',
  },
  inlineLabel: {
    flexShrink: 1,
    textAlign: 'left',
  },
  activeLabel: {
    color: '#079B73',
  },
  dots: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9E6E2',
  },
  activeDot: {
    width: 22,
    backgroundColor: '#08A66D',
  },
  statusText: {
    marginTop: 10,
    color: '#71819B',
    fontSize: 12,
    lineHeight: 18,
  },
  errorContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: '#B25148',
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  retryText: {
    color: '#079B73',
    fontSize: 12,
    fontWeight: '600',
  },
});