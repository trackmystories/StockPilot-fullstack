import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, View} from 'react-native';
type Props = {
  checked: boolean;
  mixed?: boolean;
};
export function FilterCheckbox({checked, mixed = false}: Props) {
  return <View style={[styles.box, (checked || mixed) && styles.selected]} accessible={false}>{checked || mixed ? <Ionicons name={mixed ? 'remove' : 'checkmark'} color="#FFFFFF" size={15} /> : null}</View>;
}
const styles = StyleSheet.create({
  box: {
    width: 21,
    height: 21,
    borderWidth: 1.5,
    borderColor: '#C8D4DF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  selected: {backgroundColor: '#079B73', borderColor: '#079B73'},
});