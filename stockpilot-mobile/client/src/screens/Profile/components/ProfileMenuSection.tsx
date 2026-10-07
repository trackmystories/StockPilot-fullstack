import {StyleSheet, View} from 'react-native';

type Props = {
  children: React.ReactNode;
};

export default function ProfileMenuSection({children}: Props) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
});
