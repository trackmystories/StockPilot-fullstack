import {Ionicons} from '@expo/vector-icons';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Header from '../components/Header';
import {getStockTape} from './application/getStockTape';
import {BuySellPressure} from './components/BuySellPressure';
import {RecentTape} from './components/RecentTape';
import {HttpTapeRepository} from './infrastruture/HttpTapeRepository';
import type {StockTape} from './types/tape';

type Props = {
  route: {
    params: {
      symbol: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
  embedded?: boolean;
};

export default function Tape({route, navigation, embedded = false}: Props) {
  const {symbol} = route.params;
  const repository = useMemo(() => new HttpTapeRepository(), []);
  const [tape, setTape] = useState<StockTape | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTape = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);
        const result = await getStockTape(repository, symbol);
        setTape(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load tape');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [repository, symbol],
  );

  useEffect(() => {
    void loadTape();
  }, [loadTape]);

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }

    void loadTape(true);
  };

  if (loading) {
    return (
      <View style={[styles.center, embedded && styles.embeddedCenter]}>
        <ActivityIndicator size="large" color="#079B73" />
        <Text style={styles.loadingText}>Loading market activity...</Text>
      </View>
    );
  }

  if (error && !tape) {
    return (
      <View style={[styles.center, embedded && styles.embeddedCenter]}>
        <Text style={styles.errorTitle}>Could not load tape</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => void loadTape()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!tape) {
    return null;
  }

  const content = (
    <>
      {!embedded ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={30} color="#062653" />
          </Pressable>

          <Header
            title={`${tape.symbol} Tape`}
            subtitle={`Delayed ${tape.interval} market activity`}
          />
        </>
      ) : (
        <View style={styles.embeddedHeader}>
          <Text style={styles.embeddedTitle}>Market Tape</Text>
          <Text style={styles.embeddedSubtitle}>Delayed {tape.interval} market activity</Text>
        </View>
      )}

      <BuySellPressure
        pressure={tape.pressure}
        bars={tape.pressureBars}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {error ? (
        <View style={styles.refreshError}>
          <Text style={styles.refreshErrorText}>{error}</Text>
        </View>
      ) : null}

      <RecentTape activity={tape.activity} />

      <Text style={styles.disclaimer}>
        Buy and sell pressure is estimated from recent price and volume activity and does not
        represent individual trade direction.
      </Text>
    </>
  );

  if (embedded) {
    return <View style={styles.embeddedContent}>{content}</View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  embeddedContent: {
    marginTop: 18,
    gap: 18,
  },
  embeddedHeader: {
    gap: 3,
  },
  embeddedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#062451',
  },
  embeddedSubtitle: {
    fontSize: 12,
    color: '#7184A1',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  embeddedCenter: {
    minHeight: 240,
    marginTop: 18,
    borderRadius: 18,
  },
  loadingText: {
    color: '#7184A1',
    marginTop: 12,
  },
  errorTitle: {
    color: '#062451',
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: {
    color: '#7184A1',
    marginTop: 6,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#079B73',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  refreshError: {
    paddingHorizontal: 4,
  },
  refreshErrorText: {
    color: '#B54747',
    fontSize: 12,
  },
  disclaimer: {
    color: '#8A99AE',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});
