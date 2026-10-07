import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import type {HomeStackParamList} from '../../';
import type {ScoreCardItem} from './components/ScoreCardsSection';
import {ScoreCardsSection} from './components/ScoreCardsSection';

type Props = {
  symbol: string;
  companyName?: string | null;
  items: ScoreCardItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  navigation: {
    navigate: (screen: 'AllScoreCards', params: HomeStackParamList['AllScoreCards']) => void;
  };
};

export default function Scores({
  symbol,
  companyName,
  items,
  loading,
  error,
  onRetry,
  navigation,
}: Props) {
  return (
    <View style={styles.section}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#079B73" />
          <Text style={styles.loadingText}>Calculating stock scores…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRetry}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <ScoreCardsSection
        items={items}
        onShowAll={() =>
          navigation.navigate('AllScoreCards', {
            symbol,
            companyName,
            scores: items,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 2,
  },
  loading: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#667792',
  },
  error: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B54747',
  },
  retry: {
    fontSize: 13,
    fontWeight: '600',
    color: '#079B73',
  },
});
