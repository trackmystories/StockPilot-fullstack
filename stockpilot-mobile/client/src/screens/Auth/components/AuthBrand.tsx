import {Image, StyleSheet, Text, View} from 'react-native';

export default function AuthBrand() {
  return (
    <View style={styles.container} accessible accessibilityLabel="StockPilot">
      <Image
        source={require('../../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.name}>
        Stock<Text style={styles.highlight}>Pilot</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 34,
  },
  logo: {
    width: 60,
    height: 60,
  },
  name: {
    color: '#111111',
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: -0.8,
  },
  highlight: {
    color: '#079B73',
  },
});
