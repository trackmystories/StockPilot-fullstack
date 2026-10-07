import {Pressable, StyleSheet, Text} from 'react-native';

type Props = {
  onPress: () => void;
};

export default function DeleteAccountButton({onPress}: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>Delete account</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1C7C7',
    backgroundColor: '#FFF7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#D64545',
  },
});
