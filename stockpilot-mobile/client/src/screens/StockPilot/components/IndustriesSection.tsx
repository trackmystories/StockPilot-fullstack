import {useCallback, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {StockFilterRoutes} from '../../StockFilter/domain/stockFilter';
import {stockFilterRepository} from '../../StockFilter/infrastructure/HttpStockFilterRepository';
import {
  getIndustryShortcutParams,
  INDUSTRY_SHORTCUTS,
  type IndustryShortcut,
} from '../domain/industryShortcuts';
import {KeySignalsSection} from './KeySignalsSection';
type Props = {
  onOpenResults: (params: StockFilterRoutes['StockFilterList']) => void;
  onViewAllPress: () => void;
};
type IndustryError = {
  industry: IndustryShortcut;
  message: string;
};
export function IndustriesSection({onOpenResults, onViewAllPress}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, setPending] = useState<IndustryShortcut | null>(null);
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
  const openIndustry = async (industry: IndustryShortcut) => {
    // A newer tap wins; leaving the home screen also cancels the pending request.
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setActiveIndex(INDUSTRY_SHORTCUTS.findIndex((item) => item.key === industry.key));
    setPending(industry);
    setError(null);
    try {
      // Load options only on a tap, using the existing saved-Firestore endpoint.
      const options = await stockFilterRepository.options(controller.signal);
      if (controller.signal.aborted || request.current !== controller) {
        return;
      }
      const params = getIndustryShortcutParams(options, industry.label);
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
  return (
    <View>
      <KeySignalsSection
        subtitle="Explore metals & mining stocks"
        items={INDUSTRY_SHORTCUTS}
        activeIndex={activeIndex}
        onSelect={(item) => {
          const industry = INDUSTRY_SHORTCUTS.find((option) => option.key === item.key);
          if (industry) {
            void openIndustry(industry);
          }
        }}
        onViewAllPress={onViewAllPress}
      />
      {pending ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color="#079B73" />
          <Text style={styles.statusText}>Opening {pending.label}…</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorContainer} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Retry opening ${error.industry.label}`}
            onPress={() => void openIndustry(error.industry)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  dots: {
    marginTop: 2,
    marginBottom: 8,
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
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  statusText: {
    color: '#71819B',
    fontSize: 12,
  },
  errorContainer: {
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
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  retryText: {
    color: '#079B73',
    fontSize: 12,
    fontWeight: '600',
  },
});
