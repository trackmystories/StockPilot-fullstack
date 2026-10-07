import {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {leafIds, type FilterNode} from '../domain/stockFilter';
import {FilterCheckbox} from './FilterCheckbox';
type Props = {
  option: FilterNode;
  selected: Set<string>;
  forceExpanded: boolean;
  onToggle: (ids: string[]) => void;
  depth?: number;
};
export function FilterOptionRow({option, selected, forceExpanded, onToggle, depth = 0}: Props) {
  const ids = leafIds(option);
  const count = ids.filter((id) => selected.has(id)).length;
  const checked = count === ids.length && ids.length > 0;
  const mixed = count > 0 && !checked;
  const [expanded, setExpanded] = useState(count > 0);
  const hasChildren = !!option.children?.length;
  const open = forceExpanded || expanded;
  return <View>
    <View style={[styles.row, {paddingLeft: 20 + depth * 26}]}>
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={() => onToggle(ids)}
        style={styles.option}
        accessibilityRole="checkbox"
        accessibilityLabel={`${option.label}, ${option.count} saved stocks`}
        accessibilityState={{checked: mixed ? 'mixed' : checked}}
      >
        <FilterCheckbox checked={checked} mixed={mixed} />
        <Text style={[styles.label, hasChildren && styles.parentLabel, checked && styles.selectedLabel]}>{option.label}</Text>
        <Text style={styles.count}>{option.count.toLocaleString()}</Text>
      </TouchableOpacity>
      {hasChildren
        ? <TouchableOpacity
          activeOpacity={0.65}
          onPress={() => setExpanded((value) => !value)}
          style={styles.expand}
          accessibilityRole="button"
          accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${option.label}`}
          accessibilityState={{expanded: open}}
        >
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#7788A3" />
        </TouchableOpacity>
        : <View style={styles.spacer} />}
    </View>
    {hasChildren && open
      ? <View style={styles.children}>{option.children!.map((child) => <FilterOptionRow
        key={child.id}
        option={child}
        selected={selected}
        forceExpanded={forceExpanded}
        onToggle={onToggle}
        depth={depth + 1}
      />)}</View>
      : null}
  </View>;
}
const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8
  },
  option: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9
  },
  label: {
    flex: 1,
    color: '#596B83',
    fontSize: 14,
    lineHeight: 20
  },
  parentLabel: {fontWeight: '600', color: '#081B3A'},
  selectedLabel: {color: '#079B73'},
  count: {
    color: '#8B99AC',
    fontSize: 11,
    fontVariant: ['tabular-nums']
  },
  expand: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  spacer: {width: 12},
  children: {paddingBottom: 4},
});