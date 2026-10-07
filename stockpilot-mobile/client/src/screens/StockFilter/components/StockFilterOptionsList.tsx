import {useMemo} from 'react';
import {FlatList, StyleSheet, Text} from 'react-native';
import {matchingSections, type FilterSection as Section} from '../domain/stockFilter';
import {FilterSection} from './FilterSection';
type Props = {
  sections: Section[];
  search: string;
  selected: Set<string>;
  onToggle: (section: Section, ids: string[]) => void;
};
export function StockFilterOptionsList({sections, search, selected, onToggle}: Props) {
  const visible = useMemo(() => matchingSections(sections, search), [sections, search]);
  return <FlatList
    style={styles.list}
    data={visible}
    extraData={selected}
    keyExtractor={(section) => section.id}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag"
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.content}
    renderItem={({item}) => <FilterSection
      section={item}
      selected={selected}
      searching={!!search.trim()}
      onToggle={(visibleSection, ids) => onToggle(sections.find((section) => section.id === visibleSection.id) ?? visibleSection, ids)}
    />}
    ListEmptyComponent={<Text style={styles.empty}>{search.trim() ? 'No filters match your search.' : 'No filterable fields are available in the published data.'}</Text>}
  />;
}
const styles = StyleSheet.create({
  list: {flex: 1},
  content: {paddingBottom: 18},
  empty: {
    padding: 24,
    color: '#7788A3',
    textAlign: 'center',
    lineHeight: 21
  }
});