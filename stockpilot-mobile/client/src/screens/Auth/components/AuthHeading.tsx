import {StyleSheet, Text, View} from 'react-native';

type Props = {
  eyebrow: string;
  subtitle: string;
};

export default function AuthHeading({eyebrow, title, subtitle}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 60,
  },
  eyebrow: {
    marginBottom: 12,
    color: '#079B73',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  subtitle: {
    color: '#6B7079',
    fontSize: 15,
    lineHeight: 23,
  },
});
