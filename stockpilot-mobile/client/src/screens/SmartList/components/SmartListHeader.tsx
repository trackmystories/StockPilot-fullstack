import {StyleSheet, Text, View} from 'react-native';

export function SmartListHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart List</Text>

      <Text style={styles.subtitle}>Discover stocks using our algorithms</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },

  title: {
    color: '#062451',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: 4,
    color: '#7184A1',
    fontSize: 18,
    lineHeight: 25,
  },
});
