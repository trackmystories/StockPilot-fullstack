import {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {sectionIds, type FilterSection as Section} from '../domain/stockFilter';
import {FilterOptionRow} from './FilterOptionRow';
type Props = {
  section: Section;
  selected: Set<string>;
  searching: boolean;
  onToggle: (section: Section, ids: string[]) => void;
};
export function FilterSection({section, selected, searching, onToggle}: Props) {
  const count = sectionIds(section).filter((id) => selected.has(id)).length;
  const [expanded, setExpanded] = useState(section.id === 'industry' || count > 0);
  const open = searching || expanded;
  return <View style={styles.section}>
    <TouchableOpacity
      style={styles.header}
      activeOpacity={0.7}
      onPress={() => setExpanded((value) => !value)}
      accessibilityRole="button"
      accessibilityLabel={section.title}
      accessibilityState={{expanded: open}}
    >
      <Text style={styles.title}>{section.title}</Text>
      {count ? <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View> : null}
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color="#7788A3" />
    </TouchableOpacity>
    {open
      ? <View style={styles.body}>
        {section.description ? <Text style={styles.description}>{section.description}</Text> : null}
        {section.options.map((option) => <FilterOptionRow
          key={option.id}
          option={option}
          selected={selected}
          forceExpanded={searching}
          onToggle={(ids) => onToggle(section, ids)}
        />)}
      </View>
      : null}
  </View>;
}
const styles = StyleSheet.create({
  section: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4EBF0'},
  header: {
    minHeight: 55,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  title: {
    flex: 1,
    color: '#081B3A',
    fontSize: 15,
    fontWeight: '600'
  },
  body: {paddingBottom: 10},
  description: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    color: '#7788A3',
    fontSize: 12,
    lineHeight: 18
  },
  badge: {
    minWidth: 23,
    height: 23,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#EAF8F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#079B73'
  },
});