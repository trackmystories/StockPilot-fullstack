import {useCallback, useEffect, useRef, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type ViewToken,
} from 'react-native';

export type KeySignalItem = {
  key: string;
  label: string;
};

type Props = {
  subtitle?: string;
  items: KeySignalItem[];
  activeIndex: number;
  onSelect: (item: KeySignalItem, index: number) => void;
  onViewAllPress: () => void;
};

const SWIPE_THRESHOLD = 8;

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 60,
};

function getSafeIndex(index: number, itemCount: number) {
  if (itemCount === 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), itemCount - 1);
}

export function KeySignalsSection({
  subtitle = 'Explore stocks discovered by our algorithms.',
  items,
  activeIndex,
  onSelect,
  onViewAllPress,
}: Props) {
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const hasMovedRef = useRef(false);
  const isScrollingRef = useRef(false);

  const [visibleIndex, setVisibleIndex] = useState(() => getSafeIndex(activeIndex, items.length));

  useEffect(() => {
    setVisibleIndex(getSafeIndex(activeIndex, items.length));
  }, [activeIndex, items.length]);

  const handleTouchStart = (event: GestureResponderEvent) => {
    touchStartXRef.current = event.nativeEvent.pageX;
    touchStartYRef.current = event.nativeEvent.pageY;
    hasMovedRef.current = false;
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    const deltaX = Math.abs(event.nativeEvent.pageX - touchStartXRef.current);

    const deltaY = Math.abs(event.nativeEvent.pageY - touchStartYRef.current);

    if (deltaX > SWIPE_THRESHOLD || deltaY > SWIPE_THRESHOLD) {
      hasMovedRef.current = true;
    }
  };

  const shouldIgnorePress = () => {
    if (!hasMovedRef.current && !isScrollingRef.current) {
      return false;
    }

    hasMovedRef.current = false;

    return true;
  };

  const handleViewableItemsChanged = useCallback(
    ({viewableItems}: {viewableItems: Array<ViewToken<KeySignalItem>>}) => {
      const firstVisible = viewableItems.find(
        (item) => item.isViewable && typeof item.index === 'number',
      );

      if (firstVisible?.index == null) {
        return;
      }

      setVisibleIndex(firstVisible.index);
    },
    [],
  );

  const handleSelect = (item: KeySignalItem, index: number) => {
    if (shouldIgnorePress()) {
      return;
    }

    setVisibleIndex(index);
    onSelect(item, index);
  };

  const handleViewAllPress = () => {
    if (shouldIgnorePress()) {
      return;
    }

    onViewAllPress();
  };

  const renderItem = ({item, index}: {item: KeySignalItem; index: number}) => {
    const isActive = index === visibleIndex;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        delayPressIn={50}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onPress={() => handleSelect(item, index)}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
      >
        <Text
          numberOfLines={1}
          style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <FlatList
        horizontal
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={handleViewableItemsChanged}
        onScrollBeginDrag={() => {
          isScrollingRef.current = true;
          hasMovedRef.current = true;
        }}
        onMomentumScrollBegin={() => {
          isScrollingRef.current = true;
        }}
        onMomentumScrollEnd={() => {
          isScrollingRef.current = false;
          hasMovedRef.current = false;
        }}
        scrollEventThrottle={16}
        ListFooterComponent={
          <TouchableOpacity
            activeOpacity={0.75}
            delayPressIn={50}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onPress={handleViewAllPress}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View all</Text>

            <Text style={styles.viewAllArrow}>›</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 2,
    paddingBottom: 6,
    marginTop: 25,
    marginBottom: 5,
  },

  subtitle: {
    marginTop: 2,
    marginBottom: 10,
    color: '#71819B',
    fontSize: 13,
  },

  tabsRow: {
    alignItems: 'center',
    gap: 7,
    paddingBottom: 10,
  },

  tabButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D7E0EC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.025,
    shadowRadius: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 1,
  },

  tabButtonActive: {
    backgroundColor: '#0F9D67',
    borderColor: '#0F9D67',
    shadowColor: '#0F9D67',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  tabButtonText: {
    color: '#0B2A5B',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },

  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  viewAllButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CFE8DC',
    backgroundColor: '#F8FCFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  viewAllText: {
    color: '#11A36A',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },

  viewAllArrow: {
    marginTop: -1,
    color: '#11A36A',
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '500',
  },
});
