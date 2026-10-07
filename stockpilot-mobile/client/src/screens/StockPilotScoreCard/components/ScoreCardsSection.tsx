import {useEffect, useMemo, useState} from 'react';
import {Dimensions, ScrollView, StyleSheet, Text, View} from 'react-native';
import {ActionButton} from '../../components/ActionButton';
import type {ScoreLanguage} from '../domain/scoreCardDefinitions';
import {ScoreCard, type ScoreCardItem} from './ScoreCard';

export type {ScoreCardItem};

type Props = {
  items: ScoreCardItem[];
  onShowAll: () => void;
  language?: ScoreLanguage;
};
const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - CARD_GAP) / 2;

export function ScoreCardsSection({items, onShowAll, language = 'en'}: Props) {
  const primaryItems = useMemo(
    () =>
      items
        .filter((item) => typeof item.score === 'number' && Number.isFinite(item.score))
        .slice(0, 5),
    [items],
  );
  const carouselKey = primaryItems.map((item) => item.id).join('|');
  const [position, setPosition] = useState({key: carouselKey, index: 0});

  const activeIndex =
    position.key === carouselKey
      ? Math.max(0, Math.min(position.index, primaryItems.length - 1))
      : 0;
  useEffect(() => {
    setPosition({key: carouselKey, index: 0});
  }, [carouselKey]);

  const handleScrollEnd = (offsetX: number) => {
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    setPosition({
      key: carouselKey,
      index: Math.max(0, Math.min(index, primaryItems.length - 1)),
    });
  };
  if (primaryItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>
            {language === 'es' ? 'Resumen de Puntuaciones' : 'Score Cards'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {language === 'es' ? 'Señales clave de un vistazo' : 'Score cards at a glance'}
          </Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {activeIndex + 1}/{primaryItems.length}
          </Text>
        </View>
      </View>
      <ScrollView
        key={carouselKey}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.carousel}
        onMomentumScrollEnd={(event) => handleScrollEnd(event.nativeEvent.contentOffset.x)}
      >
        {primaryItems.map((item) => (
          <ScoreCard key={item.id} item={item} language={language} width={CARD_WIDTH} />
        ))}
      </ScrollView>
      {primaryItems.length > 1 ? (
        <View style={styles.pagination}>
          {primaryItems.map((item, index) => (
            <View key={item.id} style={[styles.dot, index === activeIndex && styles.activeDot]} />
          ))}
        </View>
      ) : null}
      <ActionButton
        title={language === 'es' ? 'Ver todas las puntuaciones' : 'Show all score cards'}
        icon="grid-outline"
        iconSize={17}
        onPress={onShowAll}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#142947',
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#7788A3',
  },
  counter: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F2F7F5',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#079B73',
  },
  carousel: {
    paddingRight: 16,
    gap: CARD_GAP,
  },
  pagination: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D6E2DF',
  },
  activeDot: {
    width: 18,
    backgroundColor: '#079B73',
  },
});
