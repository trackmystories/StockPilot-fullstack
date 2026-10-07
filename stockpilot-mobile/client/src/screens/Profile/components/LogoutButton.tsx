import {Ionicons} from '@expo/vector-icons';

import {Pressable, StyleSheet, Text} from 'react-native';

type Props = {
  onPress: () => void;
};

export default function LogoutButton({onPress}: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Ionicons name="log-out-outline" size={23} color="#EF4444" />

      <Text style={styles.text}>Log Out</Text>

      <Ionicons name="chevron-forward" size={21} color="#9AA3B0" style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 72,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#FFF3F3',
  },

  text: {
    marginLeft: 14,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#EF4444',
  },

  chevron: {
    marginLeft: 'auto',
  },
});
