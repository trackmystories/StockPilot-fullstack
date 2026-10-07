import { useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StockListRow } from './StockListRow';
import { getStockListLayout, type StockListItem } from './stockListPresentation';
type Props<T extends { symbol: string }> = {
  data: T[];
  getItem: (stock: T) => StockListItem;
  onStockPress: (stock: T) => void;
  onAddToPortfolio?: (stock: T) => void;
  isFavorite: (symbol: string) => boolean;
  onToggleWatchlist: (stock: T) => void;
  updatingSymbol?: string | null;
  watchlistDisabled?: boolean;
  priceLabel?: string;
  loading?: boolean;
  loadingMessage?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  extraData?: unknown;
  ListEmptyComponent?: ReactElement | null;
  ListFooterComponent?: ReactElement | null;
};
export function StockList<T extends { symbol: string }>({
  data,
  getItem,
  onStockPress,
  onAddToPortfolio,
  isFavorite,
  onToggleWatchlist,
  updatingSymbol = null,
  watchlistDisabled = false,
  priceLabel = 'Price',
  loading = false,
  loadingMessage = 'Loading stocks…',
  refreshing = false,
  onRefresh,
  extraData,
  ListEmptyComponent,
  ListFooterComponent,
}: Props<T>) {
  const { width, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  // This View is inside each screen's safe area. Do not subtract the insets again.
  const availableWidth = Math.max(1, Math.min(measuredWidth ?? width, width));
  const layout = useMemo(
    () => getStockListLayout(availableWidth, fontScale, !!onAddToPortfolio),
    [availableWidth, fontScale, onAddToPortfolio],
  );
  return (
    <View
      style={styles.container}
      onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
    >
      <View style={[styles.columns, { paddingHorizontal: layout.padding, gap: layout.gap }]}>
        {[
          { label: 'Company', width: layout.companyWidth },
          { label: 'Price', width: layout.priceWidth },
          { label: 'Market cap', width: layout.marketCapWidth },
          { label: 'Momentum', width: layout.momentumWidth },
        ].map((column, index) => (
          <Text
            key={column.label}
            style={[
              styles.column,
              {
                width: column.width,
                fontSize: layout.labelFontSize,
                textAlign: index === 0 ? 'left' : column.label === 'Momentum' ? 'right' : 'center',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            maxFontSizeMultiplier={layout.maxFontSizeMultiplier}
          >
            {column.label}
          </Text>
        ))}
        <View style={{ width: layout.actionsWidth, flexShrink: 0 }} />
      </View>
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color="#079B73" />
          <Text style={styles.stateText}>{loadingMessage}</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={data}
          keyExtractor={(stock) => stock.symbol}
          extraData={{ layout, extraData, isFavorite, updatingSymbol, watchlistDisabled, onAddToPortfolio }}
          renderItem={({ item }) => (
            <StockListRow
              stock={getItem(item)}
              layout={layout}
              priceLabel={priceLabel}
              isFavorite={isFavorite(item.symbol)}
              watchlistBusy={updatingSymbol === item.symbol}
              watchlistDisabled={watchlistDisabled}
              onToggleWatchlist={() => onToggleWatchlist(item)}
              onPress={() => onStockPress(item)}
              onAddToPortfolio={onAddToPortfolio ? () => onAddToPortfolio(item) : undefined}
            />
          )}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            ListEmptyComponent === undefined ? (
              <Text style={styles.empty}>No stocks available.</Text>
            ) : ListEmptyComponent
          }
          ListFooterComponent={ListFooterComponent}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },

  columns: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4EBF0',
  },

  column: {
    color: '#7788A3',
    minWidth: 0,
    flexShrink: 0,
  },

  list: {
    flex: 1,
  },

  content: {
    paddingBottom: 24,
  },

  state: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  stateText: {
    color: '#7788A3',
    textAlign: 'center',
    lineHeight: 21,
  },

  empty: {
    padding: 20,
    color: '#7788A3',
    textAlign: 'center',
  },
});
