import {useState} from 'react';
import {CommonActions} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Ionicons} from '@expo/vector-icons';
import {ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StockFilterOptionsList} from './components/StockFilterOptionsList';
import type {StockFilterRoutes} from './domain/stockFilter';
import {useStockFilter} from './hooks/useStockFilter';
type Props = NativeStackScreenProps<StockFilterRoutes, 'StockFilter'>;
export default function StockFilter({navigation, route}: Props) {
  const [search, setSearch] = useState('');
  const filter = useStockFilter(route.params?.selectedIds);
  const industrySection = filter.data?.sections.find((section) => section.id === 'industry');
  const industryCount = new Set(industrySection?.options.flatMap((group) => group.children?.map((child) => child.label) ?? []) ?? []).size;
  const disabled = filter.loading || !!filter.error || !filter.data || filter.unavailable > 0;
  const done = () => {
    if (!filter.data || disabled)
      return;
    Keyboard.dismiss();
    const params = {selectedIds: [...filter.selectedIds], runId: filter.data.runId};
    if (route.params?.resultRouteKey) {
      navigation.dispatch({...CommonActions.setParams(params), source: route.params.resultRouteKey});
      navigation.goBack();
    } else navigation.replace('StockFilterList', params);
  };
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Smart score screener</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          onPress={() => {
            Keyboard.dismiss();
            navigation.goBack();
          }}
        >
          <Ionicons name="close" size={24} color="#081B3A" />
        </TouchableOpacity>
      </View>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={20} color="#7788A3" />
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search e.g. Volatility or Quality"
          placeholderTextColor="#8D9AAC"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
          accessibilityLabel="Search filter options"
        />
        {search
          ? <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Clear filter search"
            style={styles.clearSearch}
          >
            <Ionicons name="close-circle" size={18} color="#7788A3" />
          </TouchableOpacity>
          : null}
      </View>
      <Text style={styles.note}>{filter.data
        ? `${filter.data.total.toLocaleString()} available stocks · ${industryCount.toLocaleString()} industries · ${filter.data.sections.length} filter groups\nActive saved run only. Tap arrows to expand.`
        : 'Filters use saved Firestore data only'}</Text>
      {filter.unavailable > 0
        ? <Text style={styles.warning}>{filter.unavailable} previous selection(s) are no longer available. Clear selections before continuing.</Text>
        : null}
      {filter.loading
        ? <View style={styles.state}>
          <ActivityIndicator color="#079B73" />
          <Text style={styles.stateText}>Loading saved filters…</Text>
        </View>
        : filter.error
          ? <View style={styles.state}>
            <Text style={styles.stateText}>{filter.error}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={filter.retry} style={styles.retry}>
              <Text style={styles.greenText}>Try again</Text>
            </TouchableOpacity>
          </View>
          : <StockFilterOptionsList
            sections={filter.data?.sections ?? []}
            search={search}
            selected={filter.selected}
            onToggle={filter.toggle}
          />}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={filter.clear}
          disabled={!filter.selectedIds.length}
          accessibilityRole="button"
          accessibilityState={{disabled: !filter.selectedIds.length}}
          style={styles.clearButton}
        >
          <Text style={[styles.greenText, !filter.selectedIds.length && styles.disabledText]}>Clear selections</Text>
          {filter.selectedIds.length ? <Text style={styles.selectedCount}>{filter.selectedIds.length} selected</Text> : null}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.75}
          disabled={disabled}
          onPress={done}
          accessibilityRole="button"
          accessibilityLabel="Show filtered stocks"
          accessibilityState={{disabled}}
          style={[styles.done, disabled && styles.disabled]}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#FFFFFF'},
  header: {
    minHeight: 60,
    paddingLeft: 20,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: '#081B3A',
    fontSize: 23,
    fontWeight: '700'
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  search: {
    minHeight: 48,
    marginHorizontal: 20,
    marginTop: 10,
    paddingLeft: 14,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#DDE7E4',
    borderRadius: 10,
    backgroundColor: '#F8FAFB'
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 14,
    color: '#081B3A'
  },
  clearSearch: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  note: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    color: '#7788A3',
    fontSize: 11,
    lineHeight: 17
  },
  warning: {
    marginHorizontal: 20,
    marginBottom: 10,
    color: '#A86613',
    fontSize: 12,
    lineHeight: 18
  },
  state: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14
  },
  stateText: {
    color: '#7788A3',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center'
  },
  retry: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center'
  },
  footer: {
    minHeight: 82,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E4EBF0',
    backgroundColor: '#FFFFFF'
  },
  clearButton: {minHeight: 44, justifyContent: 'center'},
  greenText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#079B73'
  },
  selectedCount: {
    marginTop: 3,
    fontSize: 11,
    color: '#7788A3'
  },
  disabledText: {color: '#A2AFBD'},
  done: {
    minWidth: 91,
    minHeight: 44,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#079B73',
    borderRadius: 10
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  disabled: {opacity: 0.4},
});